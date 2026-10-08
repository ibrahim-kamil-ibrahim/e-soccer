import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/LoadingSkeletons.jsx';

export default function NotFound({ setSearchOpen, favorites, setFavorites }) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon="🔍"
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
      />
      <Link
        to="/"
        className="inline-block mt-4 px-5 py-2.5 bg-[var(--color-green)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
      >
        Go Home
      </Link>
    </div>
  );
}
