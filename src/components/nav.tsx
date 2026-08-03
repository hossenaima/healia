"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Weight" },
  { href: "/meals", label: "Meals" },
  { href: "/eat", label: "Eat" },
  { href: "/settings", label: "Settings" },
];

/**
 * Bottom bar on phones, where this app is actually used at 7am, and a top rail
 * on wider screens.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="
        glass fixed inset-x-0 bottom-0 z-20 !rounded-none
        pb-[env(safe-area-inset-bottom)]
        md:static md:!bg-transparent md:!shadow-none md:!backdrop-blur-none md:pb-0 md:before:hidden
      "
    >
      <ul className="mx-auto flex max-w-2xl md:gap-1 md:px-6">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <li key={link.href} className="flex-1 md:flex-none">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`
                  eyebrow relative flex items-center justify-center py-4
                  transition-colors md:px-4 md:py-3
                  ${active ? "!text-ink" : "hover:!text-ink-muted"}
                `}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden
                    className="
                      absolute inset-x-4 top-0 h-0.5 bg-trace
                      md:inset-x-3 md:top-auto md:bottom-0
                    "
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
