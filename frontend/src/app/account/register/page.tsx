"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);

    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Registration failed");
      return;
    }
    setOk(true);
    await signIn("credentials", { email, password, callbackUrl: "/" });
  }

  return (
    <div className="bg-neutral-50">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Register</h1>
        <p className="mt-2 text-sm text-neutral-600">Create an account with your email/password.</p>

        <div className="mt-6 rounded-xl border bg-white p-4">
          <form onSubmit={onRegister} className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500">Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>
            {error ? <div className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{error}</div> : null}
            {ok ? <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">Registered.</div> : null}
            <button type="submit" className="w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white">
              Register
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-neutral-600">
            Have an account?{" "}
            <Link href="/account/login" className="hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

