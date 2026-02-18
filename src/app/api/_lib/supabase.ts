import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createRouteSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...(options as object) });
          } catch {
            // no-op in static contexts
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...(options as object) });
          } catch {
            // no-op in static contexts
          }
        }
      }
    }
  );
}
