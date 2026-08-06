/**
 * Shown the instant a tab is tapped.
 *
 * Its real job is not to look like the page — it is to exist. A dynamic route
 * with no loading file cannot be prefetched at all, so the browser sits on the
 * old page until the server answers and the app reads as unresponsive. With
 * this here, the frame is already on screen and only the content is waiting.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded-lg bg-surface-sunk" />
      <div className="mt-4 h-4 w-64 rounded bg-surface-sunk" />
      <div className="mt-7 h-44 rounded-2xl bg-surface-sunk" />
      <div className="mt-5 h-32 rounded-2xl bg-surface-sunk" />
    </div>
  );
}
