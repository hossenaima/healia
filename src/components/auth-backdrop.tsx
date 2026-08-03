"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Ambient gradient behind the sign-in screens.
 *
 * three.js and react-three-fiber are ~27MB installed, so this is loaded only
 * here and only in the browser — the daily weigh-in and meal pages never pay
 * for it. The gradient uses the app's own teal and plum, so the front door
 * previews the palette of the chart inside.
 *
 * It is decoration: reduced-motion users and anything without WebGL get the
 * static CSS wash underneath and lose nothing.
 */

const ShaderGradientCanvas = dynamic(
  () => import("@shadergradient/react").then((m) => m.ShaderGradientCanvas),
  { ssr: false },
);
const ShaderGradient = dynamic(
  () => import("@shadergradient/react").then((m) => m.ShaderGradient),
  { ssr: false },
);

export function AuthBackdrop() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    // A canvas that cannot get a WebGL context renders an opaque black box, so
    // check before mounting rather than after.
    const canvas = document.createElement("canvas");
    const webglOk = Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
    setAnimate(motionOk && webglOk);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Static wash: the fallback, and the thing the canvas fades in over. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_18%_8%,#d6f0ea_0%,transparent_55%),radial-gradient(100%_80%_at_88%_92%,#ecdcf0_0%,transparent_50%)]" />

      {animate && (
        <div className="absolute inset-0 opacity-70 transition-opacity duration-1000">
          <ShaderGradientCanvas
            style={{ width: "100%", height: "100%" }}
            // 1x is invisible on a soft gradient and keeps the fans quiet.
            pixelDensity={1}
            pointerEvents="none"
            lazyLoad
          >
            <ShaderGradient
              control="props"
              type="waterPlane"
              color1="#dff2ec"
              color2="#86d9c6"
              color3="#cfb2e0"
              animate="on"
              uSpeed={0.08}
              uStrength={1.5}
              uDensity={1.2}
              uFrequency={5.5}
              uAmplitude={0}
              brightness={1.15}
              grain="off"
              lightType="3d"
              envPreset="city"
              reflection={0.1}
              cDistance={3}
              cPolarAngle={90}
              cAzimuthAngle={180}
              cameraZoom={1}
              positionX={0}
              positionY={0}
              positionZ={0}
              rotationX={0}
              rotationY={0}
              rotationZ={50}
            />
          </ShaderGradientCanvas>
        </div>
      )}

      {/* Keeps type legible over the brightest part of the gradient. */}
      <div className="absolute inset-0 bg-ground/55 backdrop-blur-[1px]" />
    </div>
  );
}
