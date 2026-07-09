// Shown instantly on navigation while the server component streams in. Without
// this, a click feels frozen until the remote DB queries finish; with it, the
// app paints a skeleton immediately so navigation feels responsive.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded bg-ink/10" />
      <div className="card space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-ink/10" />
        <div className="h-4 w-1/2 rounded bg-ink/10" />
        <div className="h-4 w-2/3 rounded bg-ink/10" />
      </div>
      <div className="card space-y-3 p-5">
        <div className="h-4 w-2/3 rounded bg-ink/10" />
        <div className="h-4 w-1/3 rounded bg-ink/10" />
      </div>
    </div>
  );
}
