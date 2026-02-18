import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext, isAdmin } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const { data, error } = await supabase
      .from("customer_addresses")
      .select("id, label, line1, line2, city, state, postal_code, country, delivery_instructions, is_default, active")
      .eq("customer_id", ctx.customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return fail(error.message, 400);
    return ok({ items: data ?? [] });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);
    if (!isAdmin(ctx.role)) return fail("Forbidden", 403);

    const body = await req.json();

    const payload = {
      customer_id: ctx.customerId,
      label: typeof body?.label === "string" ? body.label.trim().slice(0, 100) : "",
      line1: typeof body?.line1 === "string" ? body.line1.trim().slice(0, 200) : "",
      line2: typeof body?.line2 === "string" ? body.line2.trim().slice(0, 200) : null,
      city: typeof body?.city === "string" ? body.city.trim().slice(0, 100) : "",
      state: typeof body?.state === "string" ? body.state.trim().slice(0, 100) : "",
      postal_code: typeof body?.postal_code === "string" ? body.postal_code.trim().slice(0, 20) : "",
      country: typeof body?.country === "string" && body.country.trim() ? body.country.trim().slice(0, 2).toUpperCase() : "US",
      delivery_instructions: typeof body?.delivery_instructions === "string" ? body.delivery_instructions.trim().slice(0, 1000) : null,
      is_default: Boolean(body?.is_default),
      active: body?.active === false ? false : true
    };

    if (!payload.label || !payload.line1 || !payload.city || !payload.state || !payload.postal_code) {
      return fail("label, line1, city, state, postal_code are required", 400);
    }

    const { data, error } = await supabase
      .from("customer_addresses")
      .insert(payload)
      .select("id")
      .single();

    if (error) return fail(error.message, 400);
    return ok({ ok: true, id: data.id });
  } catch (error) {
    return serverError(error);
  }
}
