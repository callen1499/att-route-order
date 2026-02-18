import { createRouteSupabase } from "../../_lib/supabase";
import { getAuthContext } from "../../_lib/auth";
import { fail, ok, serverError } from "../../_lib/response";

export async function DELETE(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("customer_id", ctx.customerId)
      .eq("user_id", ctx.user.id)
      .eq("product_id", productId);

    if (error) return fail(error.message, 400);
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
