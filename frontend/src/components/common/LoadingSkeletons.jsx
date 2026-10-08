export function MatchSkeleton() {
  return (
    <div className="es-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton-shimmer h-4 w-16 rounded" />
        <div className="skeleton-shimmer h-4 w-20 rounded ml-auto" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-20 rounded" />
        </div>
        <div className="skeleton-shimmer h-6 w-12 rounded mx-auto" />
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-4 w-20 rounded" />
          <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="flex justify-center">
        <div className="skeleton-shimmer h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="es-card p-4">
      <div className="skeleton-shimmer h-11 w-11 rounded-xl" />
      <div className="skeleton-shimmer h-4 w-24 rounded mt-3" />
      <div className="skeleton-shimmer h-3 w-16 rounded mt-1" />
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="es-card p-4">
      <div className="skeleton-shimmer h-11 w-11 rounded-xl" />
      <div className="skeleton-shimmer h-4 w-20 rounded mt-3" />
      <div className="skeleton-shimmer h-3 w-16 rounded mt-1" />
      <div className="flex gap-2 mt-3">
        <div className="skeleton-shimmer h-6 w-8 rounded" />
        <div className="skeleton-shimmer h-6 w-8 rounded" />
        <div className="skeleton-shimmer h-6 w-8 rounded" />
      </div>
    </div>
  );
}

export function NewsSkeleton() {
  return (
    <div className="es-card overflow-hidden">
      <div className="skeleton-shimmer h-36 w-full rounded-none" />
      <div className="p-4">
        <div className="skeleton-shimmer h-4 w-16 rounded" />
        <div className="skeleton-shimmer h-4 w-full rounded mt-3" />
        <div className="skeleton-shimmer h-3 w-3/4 rounded mt-1" />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-lg font-semibold text-[var(--color-text)] mt-2">{title}</div>
      <div className="text-sm text-[var(--color-text-secondary)] mt-1">{description}</div>
    </div>
  );
}

export function ErrorState({ title, message, onRetry }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">⚠️</div>
      <div className="text-lg font-semibold text-[var(--color-text)]">{title}</div>
      <div className="text-sm text-[var(--color-text-secondary)] mt-1">{message}</div>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-[var(--color-green)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-green-light)] transition"
      >
        Try Again
      </button>
    </div>
  );
}
