import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, phone, sms_opt_in")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    return ok({
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        phone: profile?.phone ?? null,
        smsOptIn: profile?.sms_opt_in ?? false
      },
      customer: {
        id: ctx.customer?.id ?? ctx.customerId,
        name: ctx.customer?.name ?? null,
        role: ctx.role
      },
      route: ctx.route
        ? {
            deliveryDay: ctx.route.delivery_day,
            windowStart: ctx.route.delivery_window_start,
            windowEnd: ctx.route.delivery_window_end
          }
        : null
    });
  } catch (error) {
    return serverError(error);
  }
}
