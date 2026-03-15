export default function Home() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f0a 100%)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-fade-up { animation: fadeUp 0.8s ease forwards; }
        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.3s; opacity: 0; }
        .delay-3 { animation-delay: 0.5s; opacity: 0; }
        .delay-4 { animation-delay: 0.7s; opacity: 0; }
        .gold-shimmer {
          background: linear-gradient(90deg, #d97706, #fbbf24, #f59e0b, #d97706);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(234,179,8,0.1); }
        .btn-primary { position: relative; overflow: hidden; transition: all 0.3s ease; }
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s ease;
        }
        .btn-primary:hover::before { left: 100%; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(234,179,8,0.4), transparent); }
      `}</style>

      {/* Glowing orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

      {/* Nav */}
      <nav className="font-body relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
            <span className="text-black font-bold text-sm">₹</span>
          </div>
          <span className="text-white font-medium tracking-wide">Spendwise</span>
        </div>
        <div className="flex gap-3">
          <a href="/login" className="btn-primary font-body text-sm px-5 py-2.5 rounded-xl text-amber-400 transition hover:bg-amber-400/5"
            style={{ border: "1px solid rgba(234,179,8,0.3)" }}>
            Sign in
          </a>
          <a href="/signup" className="btn-primary font-body text-sm px-5 py-2.5 rounded-xl text-black font-medium transition"
            style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
            Get started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-8 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="animate-fade-up delay-1 inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full"
            style={{ border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.05)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animation: "pulse 2s infinite" }} />
            <span className="font-body text-amber-400/80 text-xs tracking-widest uppercase">Personal Finance Reimagined</span>
          </div>

          <h1 className="font-display animate-fade-up delay-2 text-white leading-none mb-6"
            style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)", fontWeight: 300 }}>
            Master your{" "}
            <span className="gold-shimmer font-semibold">money,</span>
            <br />master your life.
          </h1>

          <p className="font-body animate-fade-up delay-3 text-slate-400 leading-relaxed mb-10 max-w-lg"
            style={{ fontSize: "1.05rem" }}>
            Elegant expense tracking with powerful insights. See exactly where every rupee goes — beautifully organized, effortlessly understood.
          </p>

          <div className="animate-fade-up delay-4 flex flex-col sm:flex-row gap-4">
            <a href="/signup" className="btn-primary font-body px-8 py-4 rounded-2xl text-black font-medium text-center transition"
              style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)", boxShadow: "0 0 30px rgba(234,179,8,0.3)" }}>
              Start for free →
            </a>
            <a href="/login" className="btn-primary font-body px-8 py-4 rounded-2xl text-white text-center transition hover:bg-white/5"
              style={{ border: "1px solid rgba(234,179,8,0.3)" }}>
              Sign in to dashboard
            </a>
          </div>

          <div className="animate-fade-up delay-4 mt-12 flex items-center gap-8">
            {[["$0", "Always free"], ["100%", "Private & secure"], ["∞", "No limits"]].map(([val, label]) => (
              <div key={label}>
                <div className="font-display text-2xl text-amber-400" style={{ fontWeight: 600 }}>{val}</div>
                <div className="font-body text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4">
          {[
            { icon: "◈", color: "#d97706", title: "Track Expenses", desc: "Log every transaction in seconds with smart categorization that learns your patterns.", bg: "rgba(217,119,6,0.08)" },
            { icon: "◉", color: "#10b981", title: "Stay Organized", desc: "Separate spending by food, travel, shopping, and custom categories you define.", bg: "rgba(16,185,129,0.08)" },
            { icon: "◐", color: "#8b5cf6", title: "Visual Insights", desc: "Beautiful charts that reveal your spending habits at a glance — no spreadsheets needed.", bg: "rgba(139,92,246,0.08)" },
          ].map((f, i) => (
            <div key={f.title} className={`card-hover animate-fade-up rounded-2xl p-6 flex gap-5 items-start delay-${i + 2}`}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: f.bg, color: f.color }}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-body text-white font-medium mb-1">{f.title}</h3>
                <p className="font-body text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider mx-8" />
      <div className="font-body text-center py-6 text-slate-600 text-xs tracking-wide">
        © 2025 Spendwise · Built with care
      </div>
    </main>
  );
}