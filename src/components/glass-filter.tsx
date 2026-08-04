/**
 * The displacement map that makes the glass a lens rather than a frost.
 *
 * `feTurbulence` generates a smooth noise field; `feDisplacementMap` uses it to
 * push the backdrop pixels around, so what sits behind a panel bends the way it
 * would through an uneven piece of glass. `feGaussianBlur` on the map first
 * keeps the warp slow and liquid rather than grainy.
 *
 * Referenced from CSS as `backdrop-filter: url(#liquid-warp)`. Chrome and Edge
 * apply it; Safari ignores SVG filters in backdrop-filter and falls back to the
 * blur alone, which still looks like glass — just flatter.
 */
export function GlassFilter() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute size-0"
      focusable="false"
    >
      <filter
        id="liquid-warp"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.006 0.011"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="6" result="softNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softNoise"
          scale="18"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
