import { createHash } from "node:crypto";
import { createRouteSupabase } from "../../_lib/supabase";
import { createAdminClient } from "../../_lib/supabase-admin";
import { fail, ok, serverError } from "../../_lib/response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim().slice(0, 100) : "";
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim().slice(0, 100) : "";

    if (!token || password.length < 8) return fail("token and password (8+ chars) are required", 400);

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const supabase = await createRouteSupabase();
    const admin = createAdminClient();

    const { data: invite } = await supabase
      .from("invitations")
      .select("id, email, customer_id, role, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!invite) return fail("Invalid invitation token", 400);
    if (invite.status !== "pending") return fail("Invitation already used", 400);
    if (new Date(invite.expires_at).getTime() < Date.now()) return fail("Invitation expired", 400);

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true
    });

    if (createUserError || !createdUser.user) {
      return fail(createUserError?.message ?? "Failed to create user", 400);
    }

    const userId = createdUser.user.id;

    const { error: memberErr } = await admin.from("customer_users").insert({
      customer_id: invite.customer_id,
      user_id: userId,
      role: invite.role
    });
    if (memberErr) return fail(memberErr.message, 400);

    await admin.from("user_profiles").upsert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName
    });

    await admin
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
