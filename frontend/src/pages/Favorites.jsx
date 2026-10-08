import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamService } from '../services/teamService.js';
import { playerService } from '../services/playerService.js';
import { competitionService } from '../services/competitionService.js';
import { Heart } from 'lucide-react';
import { EmptyState } from '../components/common/LoadingSkeletons.jsx';

export default function Favorites({ setSearchOpen, favorites, setFavorites }) {
  const [teamItems, setTeamItems] = useState([]);
  const [playerItems, setPlayerItems] = useState([]);
  const [competitionItems, setCompetitionItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      try {
        const [teams, players, competitions] = await Promise.all([
          Promise.all(
            (favorites.teams || []).map(id => teamService.get(id).then(res => res.success ? res.team : null).catch(() => null))
          ),
          Promise.all(
            (favorites.players || []).map(id => playerService.get(id).then(res => res.success ? res.player : null).catch(() => null))
          ),
          Promise.all(
            (favorites.competitions || []).map(id => competitionService.get(id).then(res => res.success ? res.competition : null).catch(() => null))
          ),
        ]);
        setTeamItems(teams.filter(Boolean));
        setPlayerItems(players.filter(Boolean));
        setCompetitionItems(competitions.filter(Boolean));
      } catch (err) {
        console.error("Failed to load favorites:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, [favorites]);

  const removeFavorite = (type, id) => {
    setFavorites(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter(itemId => itemId !== id),
    }));
  };

  const hasAnyFavorites =
    (favorites.teams?.length || 0) + (favorites.players?.length || 0) + (favorites.competitions?.length || 0) > 0;

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">Favorites</h1>
        <div className="text-center py-20">
          <p className="text-[var(--color-text-muted)] text-lg">Loading favorites...</p>
        </div>
      </div>
    );
  }

  if (!hasAnyFavorites) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">Favorites</h1>
        <EmptyState icon={<Heart size={48} />} title="No Favorites Yet" description="Start adding teams, players, and competitions to your favorites." />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">Favorites</h1>

      {teamItems.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-display font-bold text-[var(--color-text)] mb-3">Teams</h2>
          <div className="space-y-3">
            {teamItems.map(team => (
              <div key={team.id} className="es-card p-4 flex items-center gap-3">
                <Link to={`/teams/${team.id}`} className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-green-dim)] flex items-center justify-center text-sm font-bold text-[var(--color-green)]">
                    {team.shortName?.slice(0, 3) || 'TM'}
                  </div>
                  <div>
                    <p className="text-[var(--color-text)] font-semibold">{team.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{team.competition?.name || team.league || ''}</p>
                  </div>
                </Link>
                <button onClick={() => removeFavorite('teams', team.id)} className="text-[var(--color-red)] hover:opacity-80 transition p-2">
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {playerItems.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-display font-bold text-[var(--color-text)] mb-3">Players</h2>
          <div className="space-y-3">
            {playerItems.map(player => (
              <div key={player.id} className="es-card p-4 flex items-center gap-3">
                <Link to={`/players/${player.id}`} className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-gold)]/15 flex items-center justify-center text-sm font-bold text-[var(--color-gold)]">
                    {player.name?.[0] || 'P'}
                  </div>
                  <div>
                    <p className="text-[var(--color-text)] font-semibold">{player.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{player.position || player.team?.name || ''}</p>
                  </div>
                </Link>
                <button onClick={() => removeFavorite('players', player.id)} className="text-[var(--color-red)] hover:opacity-80 transition p-2">
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {competitionItems.length > 0 && (
        <section>
          <h2 className="text-lg font-display font-bold text-[var(--color-text)] mb-3">Competitions</h2>
          <div className="space-y-3">
            {competitionItems.map(comp => (
              <div key={comp.id} className="es-card p-4 flex items-center gap-3">
                <Link to={`/competitions/${comp.id}`} className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-green-dim)] flex items-center justify-center text-sm font-bold text-[var(--color-green)]">
                    {comp.shortName?.slice(0, 3) || 'CP'}
                  </div>
                  <div>
                    <p className="text-[var(--color-text)] font-semibold">{comp.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{comp.region || comp.country || ''}</p>
                  </div>
                </Link>
                <button onClick={() => removeFavorite('competitions', comp.id)} className="text-[var(--color-red)] hover:opacity-80 transition p-2">
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
