import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { SearchOverlay } from '../components/common/SearchOverlay.jsx';

export default function SearchPage({ setSearchOpen, favorites, setFavorites }) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-display font-bold text-[var(--color-text)] mb-6">Search</h1>
      <div className="es-card p-6">
        <p className="text-[var(--color-text-secondary)] mb-4">
          Find your favorite teams, players, and competitions across the platform.
        </p>
        <button
          onClick={() => setSearchOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-green)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
        >
          <SearchIcon size={16} />
          Open Search
        </button>
      </div>
    </div>
  );
}
