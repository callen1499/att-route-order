import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

export async function createSupabaseServerClient() {
  const c = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return c.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            c.set({ name, value, ...options });
          } catch {
            // ignore if called during server component render
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            c.set({ name, value: "", ...options });
          } catch {
            // ignore if called during server component render
          }
        },
      },
    }
  );
}
