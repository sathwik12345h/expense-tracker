"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password. Try test@spendwise.com / password123");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f0a 100%)" }}
    >
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(234,179,8,0.07) 0%, transparent 65%)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)", transform: "translate(-30%, 30%)" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="animate-fade-up delay-1 flex items-center gap-3 mb-10 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
            <span className="text-black font-bold">₹</span>
          </div>
          <span className="font-body text-white font-medium tracking-wide">Spendwise</span>
        </div>

        {/* Card */}
        <div className="animate-fade-up delay-2 rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
          }}>
          <div className="mb-8">
            <h1 className="font-display gold-shimmer mb-2" style={{ fontSize: "2.2rem", fontWeight: 600 }}>
              Welcome back
            </h1>
            <p className="font-body text-slate-500 text-sm">Sign in to your financial dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="animate-fade-up delay-3">
              <label className="font-body text-xs text-slate-400 uppercase tracking-widest mb-2 block">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            <div className="animate-fade-up delay-3">
              <div className="flex justify-between items-center mb-2">
                <label className="font-body text-xs text-slate-400 uppercase tracking-widest">
                  Password
                </label>
                <a href="#" className="font-body text-xs text-amber-400/70 hover:text-amber-400 transition">
                  Forgot?
                </a>
              </div>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="input-field"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs font-body bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="animate-fade-up delay-4 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-body font-medium text-black transition disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #d97706, #fbbf24)",
                  boxShadow: loading ? "none" : "0 8px 30px rgba(234,179,8,0.3)",
                }}
              >
                {loading ? "Signing in..." : "Sign in to dashboard →"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-body text-center text-sm text-slate-500">
              New to Spendwise?{" "}
              <Link href="/signup" className="text-amber-400 hover:text-amber-300 transition font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="font-body text-center mt-6 text-xs text-slate-600">
          Your data is encrypted and never shared.
        </p>
      </div>
    </main>
  );
}