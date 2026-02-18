import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "owner" | "admin" | "member";

export type AuthContext = {
  user: User;
  customerId: string;
  role: AppRole;
  customer: { id: string; name: string; route_id: string | null } | null;
  route: {
    delivery_day: number;
    delivery_window_start: string;
    delivery_window_end: string;
  } | null;
};

export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: membership } = await supabase
    .from("customer_users")
    .select("customer_id, role")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, route_id")
    .eq("id", membership.customer_id)
    .maybeSingle();

  let route = null;
  if (customer?.route_id) {
    const { data: routeData } = await supabase
      .from("routes")
      .select("delivery_day, delivery_window_start, delivery_window_end")
      .eq("id", customer.route_id)
      .maybeSingle();
    route = routeData ?? null;
  }

  return {
    user: authData.user,
    customerId: membership.customer_id,
    role: membership.role as AppRole,
    customer: customer ?? null,
    route
  };
}

export function isAdmin(role: AppRole) {
  return role === "owner" || role === "admin";
}
