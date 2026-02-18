import { createRouteSupabase } from "../../_lib/supabase";
import { getAuthContext, isAdmin } from "../../_lib/auth";
import { fail, ok, serverError } from "../../_lib/response";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);
    if (!isAdmin(ctx.role)) return fail("Forbidden", 403);

    const body = await req.json();
    const allowedKeys = [
      "label",
      "line1",
      "line2",
      "city",
      "state",
      "postal_code",
      "country",
      "delivery_instructions",
      "is_default",
      "active"
    ];

    const update: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in body) update[key] = body[key];
    }

    if (!Object.keys(update).length) return fail("No fields to update", 400);

    const { error } = await supabase
      .from("customer_addresses")
      .update(update)
      .eq("id", id)
      .eq("customer_id", ctx.customerId);

    if (error) return fail(error.message, 400);
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
