import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";
import { toPositiveInt } from "../_lib/validators";

export async function GET(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const brandId = url.searchParams.get("brandId");
    const categoryId = url.searchParams.get("categoryId");
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "1";
    const page = toPositiveInt(url.searchParams.get("page"), 1) ?? 1;
    const pageSize = Math.min(toPositiveInt(url.searchParams.get("pageSize"), 20) ?? 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let favoriteProductIds: string[] | null = null;
    if (favoritesOnly) {
      const { data: favRows } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("customer_id", ctx.customerId)
        .eq("user_id", ctx.user.id);
      favoriteProductIds = (favRows ?? []).map((x) => x.product_id);
      if (!favoriteProductIds.length) {
        return ok({ items: [], page, pageSize, total: 0 });
      }
    }

    let query = supabase
      .from("products")
      .select("id, sku, name, brand_id, category_id, base_price_cents, active", { count: "exact" })
      .eq("active", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (search) query = query.ilike("name", `%${search}%`);
    if (brandId) query = query.eq("brand_id", brandId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (favoriteProductIds) query = query.in("id", favoriteProductIds);

    const { data: products, count, error } = await query;
    if (error) return fail(error.message, 400);

    const productIds = (products ?? []).map((p) => p.id);

    const [{ data: favRows }, { data: priceRows }] = await Promise.all([
      supabase
        .from("favorites")
        .select("product_id")
        .eq("customer_id", ctx.customerId)
        .eq("user_id", ctx.user.id)
        .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase
        .from("customer_product_prices")
        .select("product_id, price_cents")
        .eq("customer_id", ctx.customerId)
        .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"])
    ]);

    const favoriteSet = new Set((favRows ?? []).map((r) => r.product_id));
    const priceMap = new Map((priceRows ?? []).map((r) => [r.product_id, r.price_cents]));

    const items = (products ?? []).map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brandId: p.brand_id,
      categoryId: p.category_id,
      priceCents: priceMap.get(p.id) ?? p.base_price_cents,
      favorite: favoriteSet.has(p.id)
    }));

    return ok({ items, page, pageSize, total: count ?? items.length });
  } catch (error) {
    return serverError(error);
  }
}
