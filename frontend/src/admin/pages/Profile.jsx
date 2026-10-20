import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import { User, Calendar, Heart, Trophy, Shield, Loader2 } from 'lucide-react';

const DEFAULT_PREFS = {
  matchUpdates: true,
  liveScores: true,
  news: false,
  teamUpdates: true,
};

export default function Profile() {
  const { user, refresh } = useAuth();
  const [notifications, setNotifications] = useState(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const favCount = 0; // Placeholder — could fetch favorites count if needed

  useEffect(() => {
    if (!user) return;
    const prefs = user.preferences || {};
    setNotifications({ ...DEFAULT_PREFS, ...prefs });
    setPrefsLoaded(true);
  }, [user]);

  const toggleNotification = async (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    setSavingPrefs(true);
    try {
      await authService.updateProfile({ preferences: next });
      await refresh();
    } catch {
      setNotifications(notifications); // revert on error
    } finally {
      setSavingPrefs(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-96 bg-white border border-[var(--color-border)] rounded-xl animate-pulse" />
      </div>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const stats = [
    { icon: Heart, value: favCount, label: 'Favorites' },
    { icon: Shield, value: user.role, label: 'Role' },
    { icon: Calendar, value: memberSince, label: 'Member Since' },
    { icon: User, value: 1, label: 'Profile' },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">Profile</h1>

      <div className="es-card-static p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-green-dim)] flex items-center justify-center text-2xl font-bold text-[var(--color-green)]">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-xl font-display font-bold text-[var(--color-text)]">{user.name}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
            {user.username && (
              <p className="text-xs text-[var(--color-text-muted)]">@{user.username}</p>
            )}
            <p className="text-xs text-[var(--color-text-muted)]">Member since {memberSince}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="es-card p-4 text-center">
            <Icon size={20} className="mx-auto mb-2 text-[var(--color-green)]" />
            <p className="font-display font-extrabold text-lg text-[var(--color-text)] truncate">{value}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="es-card-static p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-[var(--color-text)]">Notification Preferences</h2>
          {savingPrefs && <Loader2 size={16} className="animate-spin text-[#16A34A]" />}
        </div>
        {!prefsLoaded ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-black/[0.03] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'matchUpdates', label: 'Match Updates' },
              { key: 'liveScores', label: 'Live Scores' },
              { key: 'news', label: 'News' },
              { key: 'teamUpdates', label: 'Team Updates' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
                <button
                  onClick={() => toggleNotification(key)}
                  disabled={savingPrefs}
                  className={`relative w-10 h-5 rounded-full transition ${savingPrefs ? 'opacity-50' : ''} ${notifications[key] ? 'bg-[#16A34A]' : 'bg-black/[0.05]'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      notifications[key] ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
