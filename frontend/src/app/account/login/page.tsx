"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) setError("Invalid email or password");
    else window.location.href = "/";
  }

  return (
    <div className="bg-neutral-50">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Login</h1>
        <p className="mt-2 text-sm text-neutral-600">Sign in with Google or your email/password.</p>

        <div className="mt-6 rounded-xl border bg-white p-4">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded border px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            Continue with Google
          </button>

          <div className="my-4 text-center text-xs text-neutral-500">or</div>

          <form onSubmit={onCredentialsLogin} className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500">Email / Username</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text"
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
            <button type="submit" className="w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white">
              Login
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-neutral-600">
            No account?{" "}
            <Link href="/account/register" className="hover:underline">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
