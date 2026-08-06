import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Lets React's <ViewTransition> crossfade one tab into the next. The
    // browser does the work, so this is the entire cost of the feature —
    // no animation library, nothing added to the bundle. Where it is not
    // supported the app just does not animate.
    viewTransition: true,
  },
};

export default nextConfig;
