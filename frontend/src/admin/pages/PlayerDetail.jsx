import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Eye, Edit, Trash2, MapPin, Hash, Award, Calendar, Globe, MessageCircle } from "lucide-react";
import { playerService } from "../../services/playerService.js";
import { teamService } from "../../services/teamService.js";
import { Badge, Button } from "../components/ui.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_COLORS = { PUBLISHED: "green", DRAFT: "yellow", ARCHIVED: "slate" };

export default function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    Promise.all([playerService.get(id), teamService.list({ limit: 200 })]).then(([pRes, tRes]) => {
      setPlayer(pRes.player || null);
      setTeam(tRes.items.find((t) => t.id === pRes.player?.teamId) || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await playerService.remove(deleteTarget.id);
      toast("Player deleted");
      setDeleteTarget(null);
      navigate("/admin/players");
    } catch (err) { toast(err.message, "error"); }
    finally { setDeleting(false); }
  };

  if (loading) return (
    <div className="min-h-[60vh] bg-white border border-[var(--color-border)] rounded-xl animate-pulse">
      <div className="p-6 space-y-4"><div className="h-8 w-48 bg-black/5 rounded" /><div className="h-4 w-72 bg-black/5 rounded" /></div>
    </div>
  );
  if (!player) return (
    <div className="min-h-[60vh] bg-white border border-[var(--color-border)] rounded-xl p-12 text-center">
      <p className="text-[var(--color-text-muted)]">Player not found.</p>
    </div>
  );

  const teamName = player.team?.name || team?.name || "—";
  const teamShort = player.team?.shortName || team?.shortName || "—";
  const nationality = player.nationality || "Ethiopia";
  const isEthiopian = nationality === "Ethiopia";
  const cityName = player.city || "";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/players" className="p-2 rounded-lg text-[#94A3B8] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={() => navigate(`/admin/players/${id}/edit`)} className="gap-2">
          <Eye size={16} /> View
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate(`/admin/players/${id}/edit`)} className="gap-2 text-[#22C55E] hover:bg-black/[0.04]">
          <Edit size={16} /> Edit
        </Button>
        <Button type="button" variant="ghost" onClick={() => setDeleteTarget(player)} className="gap-2 text-[#EF4444] hover:bg-black/[0.04]">
          <Trash2 size={16} /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo + Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex flex-col items-center text-center">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="w-28 h-28 rounded-2xl object-cover border-2 border-[var(--color-border)] mb-4" />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-[var(--color-green-dim)] flex items-center justify-center text-4xl font-bold text-[var(--color-green)] mb-4">
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">{player.name}</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{teamShort}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge color={STATUS_COLORS[player.status] || "slate"}>{player.status}</Badge>
                {player.isFeatured && <Badge color="green">Featured</Badge>}
                {player.playerStatus && <Badge color={player.playerStatus === "Active" ? "green" : player.playerStatus === "Injured" ? "yellow" : "slate"}>{player.playerStatus}</Badge>}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><Calendar size={14} className="text-[#16A34A]" /></div>
                <div><span className="text-xs text-[var(--color-text-muted)]">Date of Birth</span><p className="text-sm font-medium">{player.dateOfBirth || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><MapPin size={14} className="text-[#16A34A]" /></div>
                <div><span className="text-xs text-[var(--color-text-muted)]">City</span><p className="text-sm font-medium">{cityName || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><Globe size={14} className="text-[#16A34A]" /></div>
                <div><span className="text-xs text-[var(--color-text-muted)]">Nationality</span><p className="text-sm font-medium">{nationality}</p></div>
              </div>
              {player.height && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><Award size={14} className="text-[#16A34A]" /></div>
                  <div><span className="text-xs text-[var(--color-text-muted)]">Height</span><p className="text-sm font-medium">{player.height}</p></div>
                </div>
              )}
              {player.weight != null && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><Award size={14} className="text-[#16A34A]" /></div>
                  <div><span className="text-xs text-[var(--color-text-muted)]">Weight</span><p className="text-sm font-medium">{player.weight} kg</p></div>
                </div>
              )}
              {player.jerseyNumber != null && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><Hash size={14} className="text-[#16A34A]" /></div>
                  <div><span className="text-xs text-[var(--color-text-muted)]">Jersey #</span><p className="text-sm font-medium">{player.jerseyNumber}</p></div>
                </div>
              )}
              {player.preferredFoot && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><Award size={14} className="text-[#16A34A]" /></div>
                  <div><span className="text-xs text-[var(--color-text-muted)]">Preferred Foot</span><p className="text-sm font-medium">{player.preferredFoot}</p></div>
                </div>
              )}
            </div>
          </div>

          {player.instagram && (
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-3">Social</h3>
              <a href={player.instagram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] hover:bg-black/[0.04] transition-colors"
                onClick={(e) => e.stopPropagation()}>
                <MessageCircle size={18} className="text-pink-500" />
                <span className="text-sm text-[var(--color-text)] truncate">{player.instagram.replace(/^https?:\/\/?(?:www\.)?(?:instagram\.com\/)?/, "")}</span>
              </a>
            </div>
          )}
        </div>

        {/* Stats + Position + Team */}
        <div className="lg:col-span-2 space-y-6">
          {/* Position & Team Card */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">Position & Team</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-[var(--color-green-dim)]">
                <p className="text-xs text-[#64748B] uppercase tracking-wide">Position</p>
                <p className="text-lg font-display font-bold text-[var(--color-green)]">{player.position || "—"}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/[0.02]">
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Team</p>
                <p className="text-sm font-medium text-[var(--color-text)]">{teamName}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/[0.02]">
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Jersey #</p>
                <p className="text-lg font-display font-bold text-[var(--color-text)]">{player.jerseyNumber ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">Statistics</h3>
              <Badge color="slate">Season</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Matches", value: player.matches ?? 0, color: "text-[var(--color-text)]" },
                { label: "Goals", value: player.goals ?? 0, color: "text-[#22C55E]" },
                { label: "Assists", value: player.assists ?? 0, color: "text-[#22C55E]" },
                { label: "Minutes", value: player.minutesPlayed ?? 0, color: "text-[var(--color-text)]" },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-black/[0.02]">
                  <p className={`font-display font-extrabold text-xl ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {[
                { label: "Yellow Cards", value: player.yellowCards ?? 0 },
                { label: "Red Cards", value: player.redCards ?? 0 },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-black/[0.02]">
                  <p className="font-display font-extrabold text-xl text-[var(--color-text)]">{s.value}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Biography */}
          {player.biography && (
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-3">Biography</h3>
              <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{player.biography}</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(`/admin/players/${id}/edit`)} className="gap-2">
                <Edit size={14} /> Edit Player
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDeleteTarget(player)} className="gap-2 text-[#EF4444]">
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Player?"
        message={deleteTarget ? `This will permanently delete "${deleteTarget.name}".` : ""}
      />
    </div>
  );
}
