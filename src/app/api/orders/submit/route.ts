import { createRouteSupabase } from "../../_lib/supabase";
import { getAuthContext } from "../../_lib/auth";
import { fail, ok, serverError } from "../../_lib/response";

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx || !ctx.route) return fail("Unauthorized", 401);

    const body = await req.json();
    const addressId = typeof body?.addressId === "string" ? body.addressId : "";
    const orderNote = typeof body?.orderNote === "string" ? body.orderNote.trim().slice(0, 2000) : "";
    const confirmationChannel = body?.confirmationChannel === "sms" ? "sms" : "email";

    if (!addressId) return fail("addressId is required", 400);

    const { data: address } = await supabase
      .from("customer_addresses")
      .select("id")
      .eq("id", addressId)
      .eq("customer_id", ctx.customerId)
      .eq("active", true)
      .maybeSingle();

    if (!address) return fail("Invalid address", 400);

    const { data: draft } = await supabase
      .from("draft_carts")
      .select("id")
      .eq("customer_id", ctx.customerId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (!draft) return fail("Cart is empty", 400);

    const { data: draftItems } = await supabase
      .from("draft_cart_items")
      .select("product_id, qty, line_note")
      .eq("draft_cart_id", draft.id);

    if (!draftItems || !draftItems.length) return fail("Cart is empty", 400);

    const productIds = draftItems.map((i) => i.product_id);

    const [{ data: products }, { data: customPrices }] = await Promise.all([
      supabase.from("products").select("id, name, base_price_cents, active").in("id", productIds),
      supabase
        .from("customer_product_prices")
        .select("product_id, price_cents")
        .eq("customer_id", ctx.customerId)
        .in("product_id", productIds)
    ]);

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
    const priceMap = new Map((customPrices ?? []).map((p: any) => [p.product_id, p.price_cents]));

    for (const item of draftItems) {
      const product: any = productMap.get(item.product_id);
      if (!product || !product.active) return fail(`Unavailable product: ${item.product_id}`, 400);
      if (!Number.isInteger(item.qty) || item.qty <= 0) return fail(`Invalid quantity for ${product.name}`, 400);
    }

    const confirmationDestination = confirmationChannel === "email" ? (ctx.user.email ?? "") : "";

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: ctx.customerId,
        address_id: addressId,
        created_by: ctx.user.id,
        status: "submitted",
        route_day: ctx.route.delivery_day,
        route_window_start: ctx.route.delivery_window_start,
        route_window_end: ctx.route.delivery_window_end,
        order_note: orderNote,
        confirmation_channel: confirmationChannel,
        confirmation_destination: confirmationDestination,
        submitted_at: new Date().toISOString()
      })
      .select("id, submitted_at")
      .single();

    if (orderErr) return fail(orderErr.message, 400);

    const orderItemsPayload = draftItems.map((i) => {
      const product: any = productMap.get(i.product_id);
      const unitPrice = priceMap.get(i.product_id) ?? product.base_price_cents;
      return {
        order_id: order.id,
        product_id: i.product_id,
        product_name_snapshot: product.name,
        qty: i.qty,
        unit_price_cents: unitPrice,
        line_note: i.line_note ?? null
      };
    });

    const { error: itemErr } = await supabase.from("order_items").insert(orderItemsPayload);
    if (itemErr) return fail(itemErr.message, 400);

    const notificationStatus = confirmationChannel === "email" ? "queued" : "queued";

    await supabase.from("order_confirmations").insert({
      order_id: order.id,
      channel: confirmationChannel,
      destination: confirmationDestination || "not-provided",
      status: notificationStatus
    });

    await supabase.from("draft_cart_items").delete().eq("draft_cart_id", draft.id);

    return ok({
      orderId: order.id,
      submittedAt: order.submitted_at,
      route: {
        deliveryDay: ctx.route.delivery_day,
        windowStart: ctx.route.delivery_window_start,
        windowEnd: ctx.route.delivery_window_end
      },
      billing: "BILL_AT_DELIVERY",
      notification: {
        channel: confirmationChannel,
        status: notificationStatus
      }
    });
  } catch (error) {
    return serverError(error);
  }
}
