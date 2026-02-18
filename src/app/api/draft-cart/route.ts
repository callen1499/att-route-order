import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";

async function ensureDraftCart(supabase: Awaited<ReturnType<typeof createRouteSupabase>>, customerId: string, userId: string) {
  const { data: existing } = await supabase
    .from("draft_carts")
    .select("id, address_id, order_note, updated_at")
    .eq("customer_id", customerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("draft_carts")
    .insert({ customer_id: customerId, user_id: userId })
    .select("id, address_id, order_note, updated_at")
    .single();

  if (error) throw error;
  return created;
}

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const draft = await ensureDraftCart(supabase, ctx.customerId, ctx.user.id);

    const [{ data: items }, { data: addresses }, { data: priceRows }] = await Promise.all([
      supabase
        .from("draft_cart_items")
        .select("product_id, qty, line_note, products(name, base_price_cents)")
        .eq("draft_cart_id", draft.id),
      supabase
        .from("customer_addresses")
        .select("id, label")
        .eq("customer_id", ctx.customerId)
        .eq("active", true)
        .order("is_default", { ascending: false }),
      supabase
        .from("customer_product_prices")
        .select("product_id, price_cents")
        .eq("customer_id", ctx.customerId)
    ]);

    const priceMap = new Map((priceRows ?? []).map((r) => [r.product_id, r.price_cents]));

    const normalized = (items ?? []).map((i: any) => ({
      productId: i.product_id,
      name: i.products?.name ?? "Unknown",
      qty: i.qty,
      lineNote: i.line_note ?? "",
      priceCents: priceMap.get(i.product_id) ?? i.products?.base_price_cents ?? 0
    }));

    return ok({
      addressId: draft.address_id,
      orderNote: draft.order_note ?? "",
      updatedAt: draft.updated_at,
      route: ctx.route
        ? {
            deliveryDay: ctx.route.delivery_day,
            windowStart: ctx.route.delivery_window_start,
            windowEnd: ctx.route.delivery_window_end
          }
        : null,
      addresses: addresses ?? [],
      items: normalized
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
    const addressId = body?.addressId ?? null;
    const orderNote = typeof body?.orderNote === "string" ? body.orderNote.trim().slice(0, 2000) : "";
    const items = Array.isArray(body?.items) ? body.items : [];

    const draft = await ensureDraftCart(supabase, ctx.customerId, ctx.user.id);

    if (addressId) {
      const { data: address } = await supabase
        .from("customer_addresses")
        .select("id")
        .eq("id", addressId)
        .eq("customer_id", ctx.customerId)
        .maybeSingle();
      if (!address) return fail("Invalid addressId", 400);
    }

    const { error: cartUpdateErr } = await supabase
      .from("draft_carts")
      .update({ address_id: addressId, order_note: orderNote, updated_at: new Date().toISOString() })
      .eq("id", draft.id);

    if (cartUpdateErr) return fail(cartUpdateErr.message, 400);

    await supabase.from("draft_cart_items").delete().eq("draft_cart_id", draft.id);

    const validItems = items
      .filter((i: any) => Number.isInteger(Number(i?.qty)) && Number(i.qty) > 0 && typeof i?.productId === "string")
      .map((i: any) => ({
        draft_cart_id: draft.id,
        product_id: i.productId,
        qty: Number(i.qty),
        line_note: typeof i?.lineNote === "string" ? i.lineNote.slice(0, 1000) : null
      }));

    if (validItems.length) {
      const { error: itemErr } = await supabase.from("draft_cart_items").insert(validItems);
      if (itemErr) return fail(itemErr.message, 400);
    }

    return ok({ ok: true, draftCartId: draft.id, updatedAt: new Date().toISOString() });
  } catch (error) {
    return serverError(error);
  }
}
