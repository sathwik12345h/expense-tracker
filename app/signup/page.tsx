"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Week 2: this will call your real API to create a user in the database
    await new Promise((r) => setTimeout(r, 1000)); // simulated delay
    setSuccess(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d0a1a 50%, #0a0f12 100%)" }}
    >
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(234,179,8,0.05) 0%, transparent 65%)", transform: "translate(30%, 30%)" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="animate-fade-up delay-1 flex items-center gap-3 mb-10 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
            <span className="text-black font-bold">₹</span>
          </div>
          <span className="font-body text-white font-medium tracking-wide">Spendwise</span>
        </div>

        <div className="animate-fade-up delay-2 rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
          }}>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="font-display text-white text-2xl mb-2">Account created!</h2>
              <p className="font-body text-slate-500 text-sm">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-display violet-shimmer mb-2" style={{ fontSize: "2.2rem", fontWeight: 600 }}>
                  Create account
                </h1>
                <p className="font-body text-slate-500 text-sm">Join thousands managing money smarter</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="animate-fade-up delay-3">
                  <label className="font-body text-xs text-slate-400 uppercase tracking-widest mb-2 block">
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Sathwik s"
                    required
                    className="input-field input-field-violet"
                  />
                </div>

                <div className="animate-fade-up delay-3">
                  <label className="font-body text-xs text-slate-400 uppercase tracking-widest mb-2 block">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="input-field input-field-violet"
                  />
                </div>

                <div className="animate-fade-up delay-4">
                  <label className="font-body text-xs text-slate-400 uppercase tracking-widest mb-2 block">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="Create a strong password"
                    required
                    className="input-field input-field-violet"
                  />
                </div>

                <div className="animate-fade-up delay-5 mt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl font-body font-medium text-white transition disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                      boxShadow: loading ? "none" : "0 8px 30px rgba(139,92,246,0.3)",
                    }}
                  >
                    {loading ? "Creating account..." : "Create my account →"}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="font-body text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link href="/login" className="text-violet-400 hover:text-violet-300 transition font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}