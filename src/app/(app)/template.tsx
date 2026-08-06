import { ViewTransition } from "react";

/**
 * Crossfades the content of one tab into the next.
 *
 * A template remounts on every navigation where a layout does not, which is
 * exactly what gives React two states to transition between. The header and
 * the tab bar stay in the layout above this and never unmount, so only the
 * content below them changes — which is the whole point. Five peer tabs have
 * no forward or back, so a directional slide would be saying something untrue;
 * a crossfade says "same place, different content".
 */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition enter="auto" share="auto" default="none">
      {children}
    </ViewTransition>
  );
}
