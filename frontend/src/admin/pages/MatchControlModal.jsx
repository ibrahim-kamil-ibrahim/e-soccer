import { useState, useEffect, useCallback, useRef } from "react";
import { matchService } from "../../services/matchService.js";
import { Button, Field, TextInput } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { Link } from "react-router-dom";
import {
  Play, Pause, SkipForward, Flag, Plus, Minus, ExternalLink, Trophy,
} from "lucide-react";

const EVENT_ICON = {
  GOAL: "⚽", OWN_GOAL: "⚽", PENALTY: "⚽",
  YELLOW_CARD: "🟨", RED_CARD: "🟥", SUBSTITUTION: "🔄",
};

function displayMinute(m, phase, addedTime, addedTimeSecond) {
  if (m == null) return "—";
  if (phase === "ET") return `${m}'`;
  if (m === 45 && addedTime) return `45+${addedTime}'`;
  if (m === 90 && addedTimeSecond) return `90+${addedTimeSecond}'`;
  return `${m}'`;
}

function determineWinner(m) {
  if (m?.homeScore == null || m?.awayScore == null) return null;
  if (m.homeScore > m.awayScore) return m.homeTeam;
  if (m.awayScore > m.homeScore) return m.awayTeam;
  if (m.homePenalties != null && m.awayPenalties != null) {
    if (m.homePenalties > m.awayPenalties) return m.homeTeam;
    if (m.awayPenalties > m.homePenalties) return m.awayTeam;
  }
  return null;
}

export default function MatchControlModal({ matchId, open, onClose, onChanged }) {
  const { toast } = useToast();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [scorer, setScorer] = useState("");
  const [penHome, setPenHome] = useState("");
  const [penAway, setPenAway] = useState("");

  useEffect(() => {
    if (!open || !matchId) return;
    let alive = true;
    setLoading(true);
    setScorer(""); setPenHome(""); setPenAway(""); setRunning(false);
    matchService.get(matchId)
      .then((r) => {
        if (!alive) return;
        const m = r.match || r;
        setMatch(m);
        setRunning(m?.status === "LIVE");
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, matchId, toast]);

  // local auto-clock while LIVE
  useEffect(() => {
    if (!running || !match || match.status !== "LIVE") return;
    const iv = setInterval(() => {
      setMatch((m) => (m && m.minute != null && m.minute < 130 ? { ...m, minute: m.minute + 1 } : m));
    }, 5000);
    return () => clearInterval(iv);
  }, [running, match?.status]);

  const persist = useCallback(async (next, { withEvents = false, quiet = false } = {}) => {
    if (!next) return null;
    if (!quiet) setSaving(true);
    try {
      const payload = {
        homeTeamId: next.homeTeamId,
        awayTeamId: next.awayTeamId,
        status: next.status,
        minute: next.minute,
        phase: next.phase,
        addedTime: next.addedTime,
        addedTimeSecond: next.addedTimeSecond,
        homeScore: next.homeScore,
        awayScore: next.awayScore,
        homePenalties: next.homePenalties,
        awayPenalties: next.awayPenalties,
      };
      if (withEvents) {
        payload.events = (next.events || []).map((e) => ({
          type: e.type, side: e.side, minute: e.minute,
          playerId: e.playerId ?? null, playerName: e.playerName || null,
          assist: e.assist || null, playerIn: e.playerIn || null, playerOut: e.playerOut || null,
        }));
      }
      const res = await matchService.update(next.id, payload);
      const fresh = res.match || { ...next };
      setMatch(fresh);
      onChanged?.(fresh);
      return fresh;
    } catch (e) {
      toast(e.message, "error");
      return null;
    } finally {
      if (!quiet) setSaving(false);
    }
  }, [onChanged, toast]);

  const matchRef = useRef(null);
  const persistRef = useRef(null);
  useEffect(() => { matchRef.current = match; }, [match]);
  useEffect(() => { persistRef.current = persist; }, [persist]);

  // save the running clock periodically so the public report stays in sync
  useEffect(() => {
    if (!running || match?.status !== "LIVE") return;
    const iv = setInterval(() => {
      const m = matchRef.current;
      if (m && m.status === "LIVE") persistRef.current?.(m, { quiet: true });
    }, 30000);
    return () => clearInterval(iv);
  }, [running, match?.status]);

  if (!open) return null;

  const start = async () => {
    const next = {
      ...match, status: "LIVE", minute: match.minute ?? 1,
      phase: match.phase || "REGULATION",
      homeScore: match.homeScore ?? 0, awayScore: match.awayScore ?? 0,
    };
    setMatch(next); setRunning(true);
    await persist(next);
  };
  const pause = async () => { setRunning(false); await persist(match); };
  const resume = () => setRunning(true);

  const bumpMinute = async (delta) => {
    const minute = Math.max(0, Math.min(130, (match.minute ?? 0) + delta));
    const next = { ...match, minute };
    setMatch(next); await persist(next);
  };
  const jump = async (minute) => { const next = { ...match, minute }; setMatch(next); await persist(next); };

  const addStoppage = async (mins) => {
    // first-half stoppage before 45 reached, else second-half
    const firstHalf = (match.minute ?? 0) <= 45;
    const next = firstHalf
      ? { ...match, addedTime: (match.addedTime ?? 0) + mins }
      : { ...match, addedTimeSecond: (match.addedTimeSecond ?? 0) + mins };
    setMatch(next); await persist(next);
  };

  const startExtraTime = async () => {
    const next = { ...match, phase: "ET", minute: 91, status: "LIVE" };
    setMatch(next); setRunning(true); await persist(next);
  };

  const setPenalties = async () => {
    const hp = penHome === "" ? null : Number(penHome);
    const ap = penAway === "" ? null : Number(penAway);
    const next = { ...match, phase: "PENS", homePenalties: hp, awayPenalties: ap };
    setMatch(next); await persist(next);
  };

  const addGoal = async (side) => {
    const cur = match[side === "HOME" ? "homeScore" : "awayScore"] ?? 0;
    const event = {
      type: "GOAL", side, minute: match.minute ?? null,
      playerName: scorer.trim() || null,
    };
    const next = {
      ...match,
      [side === "HOME" ? "homeScore" : "awayScore"]: cur + 1,
      events: [...(match.events || []), event],
    };
    setMatch(next); setScorer("");
    await persist(next, { withEvents: true });
  };

  const removeGoal = async (side) => {
    const key = side === "HOME" ? "homeScore" : "awayScore";
    const cur = match[key] ?? 0;
    if (cur <= 0) return;
    const evs = [...(match.events || [])];
    for (let i = evs.length - 1; i >= 0; i--) {
      if (evs[i].side === side && (evs[i].type === "GOAL" || evs[i].type === "PENALTY" || evs[i].type === "OWN_GOAL")) { evs.splice(i, 1); break; }
    }
    const next = { ...match, [key]: cur - 1, events: evs };
    setMatch(next); await persist(next, { withEvents: true });
  };

  const finishMatch = async (fastForward = false) => {
    setRunning(false);
    const ftMinute = fastForward ? (match.phase === "ET" ? 120 : 90) : (match.minute ?? 90);
    const next = { ...match, status: "FINISHED", minute: ftMinute };
    setMatch(next);
    const fresh = await persist(next);
    if (fresh) {
      const w = determineWinner(fresh);
      toast(w ? `Full time — ${w.shortName || w.name} wins` : "Full time — level (decide by penalties)");
    }
  };

  const resetClock = async () => {
    setRunning(false);
    const next = { ...match, minute: 0, addedTime: null, addedTimeSecond: null, phase: null };
    setMatch(next); await persist(next);
  };

  const isBracket = match?.roundNumber != null;
  const clockLive = match?.status === "LIVE";
  const winner = match?.status === "FINISHED" ? determineWinner(match) : null;
  const level = match?.homeScore != null && match?.homeScore === match?.awayScore;
  const events = [...(match?.events || [])].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="py-12 text-center text-sm text-[#64748B]">Loading match...</div>
        ) : !match ? (
          <div className="py-12 text-center text-sm text-[#64748B]">Match not found.</div>
        ) : (
          <>
            {/* Header: teams + score + clock */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                {match.competition?.name || "Match Control"}
              </span>
              <span className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${match.status === "LIVE" ? "bg-[#16A34A] text-white" : match.status === "FINISHED" ? "bg-[#334155] text-white" : "bg-[#E2E8F0] text-[#475569]"}`}>{match.status}</span>
                {match.phase && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-white">{match.phase}</span>}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4 text-center">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[#0F172A] truncate">{match.homeTeam?.name}</div>
              </div>
              <div className="px-3">
                <div className="text-3xl font-display font-black text-[#0F172A]">{match.homeScore ?? 0} - {match.awayScore ?? 0}</div>
                <div className="text-xs text-[#64748B] mt-1 font-mono">
                  {displayMinute(match.minute, match.phase, match.addedTime, match.addedTimeSecond)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[#0F172A] truncate">{match.awayTeam?.name}</div>
              </div>
            </div>

            {/* Clock controls */}
            <div className="rounded-lg border border-[#E2E8F0] p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Clock</span>
                <div className="flex gap-2">
                  {match.status === "SCHEDULED" && (
                    <Button size="sm" onClick={start} loading={saving}><Play className="w-3.5 h-3.5" /> Start Match</Button>
                  )}
                  {match.status === "LIVE" && !running && (
                    <Button size="sm" onClick={resume}><Play className="w-3.5 h-3.5" /> Resume</Button>
                  )}
                  {match.status === "LIVE" && running && (
                    <Button size="sm" variant="ghost" onClick={pause} loading={saving}><Pause className="w-3.5 h-3.5" /> Pause</Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => bumpMinute(-1)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed" title="-1 min"><Minus className="w-3.5 h-3.5" /></button>
                <button onClick={() => bumpMinute(1)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed" title="+1 min"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => bumpMinute(5)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed text-xs">+5</button>
                <span className="w-px h-5 bg-[#E2E8F0]" />
                <button onClick={() => jump(45)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed text-xs">HT</button>
                <button onClick={() => jump(90)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed text-xs">90'</button>
                <span className="w-px h-5 bg-[#E2E8F0]" />
                <span className="text-[10px] text-[#94A3B8] uppercase">Add time</span>
                <button onClick={() => addStoppage(1)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed text-xs">+1</button>
                <button onClick={() => addStoppage(3)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed text-xs">+3</button>
                <button onClick={() => addStoppage(5)} disabled={!clockLive || saving} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed text-xs">+5</button>
                {!clockLive && <span className="text-[10px] text-[#94A3B8] italic">Start match to run the clock</span>}
              </div>
            </div>

            {/* Score + goals */}
            <div className="rounded-lg border border-[#E2E8F0] p-3 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">Goals</div>
              <div className="flex items-center gap-2 mb-3">
                <TextInput value={scorer} onChange={(e) => setScorer(e.target.value)} placeholder="Scorer name (optional)" className="flex-1" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => addGoal("HOME")} loading={saving}>
                  <Plus className="w-3.5 h-3.5" /> {match.homeTeam?.shortName || match.homeTeam?.name || "Home"} goal
                </Button>
                <Button size="sm" className="flex-1" onClick={() => addGoal("AWAY")} loading={saving}>
                  <Plus className="w-3.5 h-3.5" /> {match.awayTeam?.shortName || match.awayTeam?.name || "Away"} goal
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="ghost" className="flex-1 text-[#64748B]" onClick={() => removeGoal("HOME")} disabled={saving}>− Undo home</Button>
                <Button size="sm" variant="ghost" className="flex-1 text-[#64748B]" onClick={() => removeGoal("AWAY")} disabled={saving}>− Undo away</Button>
              </div>
            </div>

            {/* Extra time + penalties (knockout) */}
            {level && match.status === "LIVE" && match.phase !== "ET" && (match.minute ?? 0) >= 90 && (
              <div className="rounded-lg border border-[#F59E0B]/40 bg-[#FFFbeb] p-3 mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309] mb-2">Level after 90'</div>
                <Button size="sm" onClick={startExtraTime} loading={saving}><Flag className="w-3.5 h-3.5" /> Go to Extra Time</Button>
              </div>
            )}
            {level && (match.phase === "ET" || match.status === "LIVE") && (
              <div className="rounded-lg border border-[#E2E8F0] p-3 mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">Penalties (if still level)</div>
                <div className="flex items-end gap-2">
                  <Field label="Home" className="flex-1"><TextInput type="number" min="0" value={penHome} onChange={(e) => setPenHome(e.target.value)} placeholder="0" /></Field>
                  <Field label="Away" className="flex-1"><TextInput type="number" min="0" value={penAway} onChange={(e) => setPenAway(e.target.value)} placeholder="0" /></Field>
                  <Button size="sm" onClick={setPenalties} loading={saving}>Set pens</Button>
                </div>
              </div>
            )}

            {/* Events timeline */}
            <div className="rounded-lg border border-[#E2E8F0] p-3 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">Timeline ({events.length})</div>
              {events.length === 0 ? (
                <div className="text-sm text-[#94A3B8]">No events yet.</div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {events.map((e, i) => (
                    <div key={e.id ?? i} className="flex items-center gap-2 text-sm">
                      <span className="w-10 text-right font-mono text-xs text-[#16A34A]">{e.minute != null ? `${e.minute}'` : "—"}</span>
                      <span>{EVENT_ICON[e.type] || "•"}</span>
                      <span className="flex-1 truncate text-[#0F172A]">{e.playerName || e.type.toLowerCase()}</span>
                      <span className="text-[10px] text-[#94A3B8]">{e.side === "AWAY" ? (match.awayTeam?.shortName || "AWY") : (match.homeTeam?.shortName || "HOM")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Winner + actions */}
            {winner && (
              <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 p-3 mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#16A34A]" />
                <span className="text-sm font-semibold text-[#16A34A]">{winner.shortName || winner.name} wins</span>
                {isBracket && <span className="text-xs text-[#16A34A]">→ advances to next round</span>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {match.status !== "FINISHED" && (
                <>
                  <Button size="sm" onClick={() => finishMatch(false)} loading={saving}>
                    <Flag className="w-3.5 h-3.5" /> Finish (FT)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => finishMatch(true)} loading={saving} className="text-[#475569]">
                    <SkipForward className="w-3.5 h-3.5" /> Skip to full time
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={resetClock} disabled={saving} className="text-[#64748B]">Reset clock</Button>
              <div className="flex-1" />
              <Link to={`/match/${match.id}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#16A34A] hover:bg-[#16A34A]/10 border border-[#16A34A]/30">
                <ExternalLink className="w-3.5 h-3.5" /> Report
              </Link>
              <Button size="sm" variant="ghost" onClick={onClose} disabled={saving}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
