import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // Keep the live connection's heartbeat in a background worker. Browsers slow down timers in tabs you aren't
    // looking at, which made the connection drop quietly after a while.
    realtime: { worker: true },
  });
}