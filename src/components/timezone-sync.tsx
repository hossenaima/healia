"use client";

import { useEffect } from "react";
import { syncTimezoneAction } from "@/app/actions/settings";

/**
 * Tells the server which zone this browser is in, if it has changed.
 *
 * Renders nothing. The server cannot know this — only the browser can — and
 * asking once at sign-in was not enough, because a session lasts 90 days and
 * an account can outlive several of them without ever signing in again.
 */
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (here && here !== current) void syncTimezoneAction(here);
  }, [current]);

  return null;
}
