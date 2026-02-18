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
    const limit = Math.min(toPositiveInt(url.searchParams.get("limit"), 20) ?? 20, 100);

    const { data, error } = await supabase
      .from("orders")
      .select("id, submitted_at, status, order_items(count)")
      .eq("customer_id", ctx.customerId)
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (error) return fail(error.message, 400);

    const items = (data ?? []).map((row: any) => ({
      orderId: row.id,
      submittedAt: row.submitted_at,
      status: row.status,
      itemCount: row.order_items?.[0]?.count ?? 0
    }));

    return ok({ items, nextCursor: null });
  } catch (error) {
    return serverError(error);
  }
}
