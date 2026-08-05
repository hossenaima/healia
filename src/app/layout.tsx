import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { GlassFilter } from "@/components/glass-filter";

// Geometric and even-width, with restrained terminals. Nunito's very round
// letterforms read as cartoonish once they get heavy, which is exactly where
// the big figures live; this keeps the warmth without the bounce. Capped at
// 700 for the same reason.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Helia",
  description: "A daily log of weigh-ins and meals.",
  manifest: "/manifest.webmanifest",
  // iPhone only delivers push to a Home Screen app, so being installable is
  // not a nicety here — it is what makes reminders possible at all.
  appleWebApp: { capable: true, title: "Helia", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#f6f8f5",
  // Without this, `env(safe-area-inset-*)` resolves to 0 on iPhone and the
  // bottom bar sits under the home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GlassFilter />
        {children}
      </body>
    </html>
  );
}
