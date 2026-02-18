import { createHash, randomBytes } from "node:crypto";
import { createRouteSupabase } from "../_lib/supabase";
import { getAuthContext, isAdmin } from "../_lib/auth";
import { fail, ok, serverError } from "../_lib/response";
import { isEmail } from "../_lib/validators";

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);
    if (!isAdmin(ctx.role)) return fail("Forbidden", 403);

    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body?.role === "admin" ? "admin" : "member";

    if (!isEmail(email)) return fail("Valid email is required", 400);

    const rawToken = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        customer_id: ctx.customerId,
        email,
        role,
        token_hash: tokenHash,
        invited_by: ctx.user.id,
        status: "pending",
        expires_at: expiresAt
      })
      .select("id, expires_at")
      .single();

    if (error) return fail(error.message, 400);

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invitations/accept?token=${rawToken}`;

    return ok({
      ok: true,
      inviteId: data.id,
      expiresAt: data.expires_at,
      inviteUrl
    });
  } catch (error) {
    return serverError(error);
  }
}
