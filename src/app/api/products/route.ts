import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const ctx = await getAuthContext(supabase);

  if (!ctx.user || !ctx.customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const favoritesOnly = req.nextUrl.searchParams.get("favoritesOnly") === "1";

  let productIds: string[] | null = null;

  if (favoritesOnly) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("customer_id", ctx.customerId)
      .eq("user_id", ctx.user.id);

    productIds = (favs ?? []).map((f: any) => f.product_id);

    if (!productIds.length) {
      return NextResponse.json({ items: [], total: 0 });
    }
  }

  let query = supabase
    .from("products")
    .select("id, sku, name, base_price_cents, active")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(100);

  if (search) query = query.ilike("name", `%${search}%`);
  if (productIds) query = query.in("id", productIds);

  const { data: products, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = products ?? [];
  const productIdList = rows.map((p: any) => p.id);

  const [{ data: favRows }, { data: customPriceRows }] = await Promise.all([
    supabase
      .from("favorites")
      .select("product_id")
      .eq("customer_id", ctx.customerId)
      .eq("user_id", ctx.user.id)
      .in("product_id", productIdList.length ? productIdList : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("customer_product_prices")
      .select("product_id, price_cents")
      .eq("customer_id", ctx.customerId)
      .in("product_id", productIdList.length ? productIdList : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const favoriteSet = new Set((favRows ?? []).map((f: any) => f.product_id));
  const priceMap = new Map((customPriceRows ?? []).map((r: any) => [r.product_id, r.price_cents]));

  const items = rows.map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    priceCents: priceMap.get(p.id) ?? p.base_price_cents,
    favorite: favoriteSet.has(p.id),
  }));

  return NextResponse.json({ items, total: items.length });
}
