import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const err = searchParams?.error ? decodeURIComponent(searchParams.error) : "";

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1 className="text-2xl font-bold mb-2">Sign In</h1>
      <p className="text-sm text-gray-600 mb-4">Email and password only.</p>

      <form action={signIn} className="space-y-3">
        <input
          className="input"
          type="email"
          name="email"
          placeholder="you@company.com"
          required
        />
        <input
          className="input"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />

        {err ? <p className="text-sm text-red-700">{err}</p> : null}

        <button className="button w-full" type="submit">
          Sign In
        </button>
      </form>
    </div>
  );
}
