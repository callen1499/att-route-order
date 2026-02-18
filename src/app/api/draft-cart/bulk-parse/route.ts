import { createRouteSupabase } from "../../_lib/supabase";
import { getAuthContext } from "../../_lib/auth";
import { fail, ok, serverError } from "../../_lib/response";

function parseLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.*)\s+(\d+)$/);
  if (!match) return { name: trimmed, qty: 1 };
  return { name: match[1].trim(), qty: Number(match[2]) };
}

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const ctx = await getAuthContext(supabase);
    if (!ctx) return fail("Unauthorized", 401);

    const body = await req.json();
    const rawText = typeof body?.rawText === "string" ? body.rawText : "";

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 200);

    const matched: Array<{ input: string; productId: string; name: string; qty: number }> = [];
    const unmatched: Array<{ input: string; reason: string }> = [];

    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed || parsed.qty <= 0) {
        unmatched.push({ input: line, reason: "Invalid format" });
        continue;
      }

      const { data: product } = await supabase
        .from("products")
        .select("id, name")
        .ilike("name", `%${parsed.name}%`)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (!product) {
        unmatched.push({ input: line, reason: "No product match" });
        continue;
      }

      matched.push({
        input: line,
        productId: product.id,
        name: product.name,
        qty: parsed.qty
      });
    }

    return ok({ matched, unmatched });
  } catch (error) {
    return serverError(error);
  }
}
