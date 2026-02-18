import { createRouteSupabase } from "../../_lib/supabase";
import { getAuthContext } from "../../_lib/auth";
import { fail, ok, serverError } from "../../_lib/response";

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const body = await req.json();
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const qty = Number(body?.qty);
    const lineNote = typeof body?.lineNote === "string" ? body.lineNote.slice(0, 1000) : null;

    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return fail("productId and positive integer qty are required", 400);
    }

    let { data: draft } = await supabase
      .from("draft_carts")
      .select("id")
      .eq("customer_id", ctx.customerId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (!draft) {
      const { data: created, error } = await supabase
        .from("draft_carts")
        .insert({ customer_id: ctx.customerId, user_id: ctx.user.id })
        .select("id")
        .single();
      if (error) return fail(error.message, 400);
      draft = created;
    }

    const { data: existing } = await supabase
      .from("draft_cart_items")
      .select("qty")
      .eq("draft_cart_id", draft.id)
      .eq("product_id", productId)
      .maybeSingle();

    const nextQty = (existing?.qty ?? 0) + qty;

    const { error } = await supabase.from("draft_cart_items").upsert({
      draft_cart_id: draft.id,
      product_id: productId,
      qty: nextQty,
      line_note: lineNote
    });

    if (error) return fail(error.message, 400);

    await supabase.from("draft_carts").update({ updated_at: new Date().toISOString() }).eq("id", draft.id);

    return ok({ ok: true, draftCartId: draft.id, updatedAt: new Date().toISOString() });
  } catch (error) {
    return serverError(error);
  }
}
