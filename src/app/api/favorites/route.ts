import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";
import { toPositiveInt } from "../_lib/validators";

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const body = await req.json();
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const defaultQty = toPositiveInt(body?.defaultQty, 1) ?? 1;

    if (!productId) return fail("productId is required", 400);

    const { error } = await supabase.from("favorites").upsert({
      customer_id: ctx.customerId,
      user_id: ctx.user.id,
      product_id: productId,
      default_qty: defaultQty
    });

    if (error) return fail(error.message, 400);
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
