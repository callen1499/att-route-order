import { createRouteSupabase } from "../../../_lib/supabase";
import { getAuthContext } from "../../../_lib/auth";
import { fail, ok, serverError } from "../../../_lib/response";

export async function POST(_: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    let { data: draft } = await supabase
      .from("draft_carts")
      .select("id")
      .eq("customer_id", ctx.customerId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (!draft) {
      const { data: created, error: createErr } = await supabase
        .from("draft_carts")
        .insert({ customer_id: ctx.customerId, user_id: ctx.user.id })
        .select("id")
        .single();
      if (createErr) return fail(createErr.message, 400);
      draft = created;
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, address_id")
      .eq("id", orderId)
      .eq("customer_id", ctx.customerId)
      .maybeSingle();

    if (!order) return fail("Order not found", 404);

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, qty, line_note")
      .eq("order_id", orderId);

    await supabase.from("draft_cart_items").delete().eq("draft_cart_id", draft.id);

    const payload = (orderItems ?? [])
      .filter((i) => i.product_id && i.qty > 0)
      .map((i) => ({
        draft_cart_id: draft!.id,
        product_id: i.product_id,
        qty: i.qty,
        line_note: i.line_note
      }));

    if (payload.length) {
      const { error: insertErr } = await supabase.from("draft_cart_items").insert(payload);
      if (insertErr) return fail(insertErr.message, 400);
    }

    await supabase
      .from("draft_carts")
      .update({ address_id: order.address_id, updated_at: new Date().toISOString() })
      .eq("id", draft.id);

    return ok({ ok: true, draftCartId: draft.id });
  } catch (error) {
    return serverError(error);
  }
}
