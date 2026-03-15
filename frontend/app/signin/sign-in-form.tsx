"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function normalizeCallbackUrl(value: string | undefined): string {
  if (!value) return "/";
  // Only allow internal navigations to avoid open redirects.
  if (value.startsWith("/")) return value;
  return "/";
}

export default function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const safeCallbackUrl = normalizeCallbackUrl(callbackUrl);

    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
      callbackUrl: safeCallbackUrl,
    } as any);

    setLoading(false);
    if (res && (res as any).error) {
      setError((res as any).error);
      return;
    }

    router.replace(safeCallbackUrl);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 bg-card rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary text-white rounded"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
