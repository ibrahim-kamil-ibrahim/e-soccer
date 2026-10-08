import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Calendar, Heart, Trophy } from 'lucide-react';

export default function Profile({ setSearchOpen, favorites, setFavorites }) {
  const [notifications, setNotifications] = useState({
    matchUpdates: true,
    liveScores: true,
    news: false,
    teamUpdates: true,
  });

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const favCount = (favorites.teams?.length || 0) + (favorites.players?.length || 0) + (favorites.competitions?.length || 0);

  const stats = [
    { icon: Heart, value: favCount, label: 'Favorites' },
    { icon: Trophy, value: 3, label: 'Leagues' },
    { icon: Calendar, value: 12, label: 'Matches' },
    { icon: User, value: 1, label: 'Profile' },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">Profile</h1>

      <div className="es-card-static p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-green-dim)] flex items-center justify-center text-2xl font-bold text-[var(--color-green)]">
            A
          </div>
          <div>
            <p className="text-xl font-display font-bold text-[var(--color-text)]">Admin User</p>
            <p className="text-sm text-[var(--color-text-secondary)]">admin@footballplatform.com</p>
            <p className="text-xs text-[var(--color-text-muted)]">Member since Jan 2024</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="es-card p-4 text-center">
            <Icon size={20} className="mx-auto mb-2 text-[var(--color-green)]" />
            <p className="font-display font-extrabold text-xl text-[var(--color-text)]">{value}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="es-card-static p-5">
        <h2 className="text-lg font-display font-bold text-[var(--color-text)] mb-4">Notification Preferences</h2>
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
                className="relative w-10 h-5 rounded-full bg-black/[0.05] transition"
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--color-green)] transition-all ${
                    notifications[key] ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
