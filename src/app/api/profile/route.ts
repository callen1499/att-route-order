import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const { data } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, phone, sms_opt_in")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    return ok({
      profile: data ?? {
        first_name: "",
        last_name: "",
        phone: null,
        sms_opt_in: false
      }
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const body = await req.json();

    const payload = {
      user_id: ctx.user.id,
      first_name: typeof body?.first_name === "string" ? body.first_name.trim().slice(0, 100) : "",
      last_name: typeof body?.last_name === "string" ? body.last_name.trim().slice(0, 100) : "",
      phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim().slice(0, 30) : null,
      sms_opt_in: Boolean(body?.sms_opt_in)
    };

    const { error } = await supabase.from("user_profiles").upsert(payload);
    if (error) return fail(error.message, 400);

    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
