import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "landing" | "login" | "signup" | "setup" | "app";

type UserProfile = {
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  grade: string;
  school: string;
  subjects: string[];
  studyGoal: number; // mins/day
  streak: number;
  joinDate: string;
};

type StudyNode = {
  id: string;
  title: string;
  description: string;
  mastery: number;
  timeSpent: number;
  children: StudyNode[];
  expanded: boolean;
  color: string;
  tags: string[];
  lastStudied: string;
};

type LeaderEntry = {
  id: string;
  name: string;
  avatar: string;
  totalNodes: number;
  avgMastery: number;
  streak: number;
  totalTime: number;
  rank: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const NODE_COLORS = [
  "#6c63ff", "#00e5b0", "#ff6b6b", "#ffb347", "#a78bfa",
  "#34d399", "#f472b6", "#60a5fa",
];

function pickColor(index: number) { return NODE_COLORS[index % NODE_COLORS.length]; }

function masteryLabel(m: number) {
  if (m >= 90) return "Expert";
  if (m >= 70) return "Proficient";
  if (m >= 50) return "Learning";
  if (m >= 25) return "Beginner";
  return "New";
}

function masteryColor(m: number) {
  if (m >= 90) return "#00e5b0";
  if (m >= 70) return "#6c63ff";
  if (m >= 50) return "#ffb347";
  if (m >= 25) return "#f472b6";
  return "#4a5270";
}

function fmtTime(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12", "Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];
const SUBJECT_OPTIONS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "History", "Literature", "Economics", "Psychology", "Philosophy", "Art", "Music"];
const AVATAR_COLORS = ["#6c63ff", "#00e5b0", "#ff6b6b", "#ffb347", "#a78bfa", "#f472b6", "#60a5fa", "#34d399"];

const INITIAL_LEADERS: LeaderEntry[] = [
  { id: "1", name: "Alex Rivera", avatar: "AR", totalNodes: 42, avgMastery: 88, streak: 21, totalTime: 1840, rank: 1 },
  { id: "2", name: "Priya Sharma", avatar: "PS", totalNodes: 38, avgMastery: 84, streak: 15, totalTime: 1620, rank: 2 },
  { id: "3", name: "Kai Nakamura", avatar: "KN", totalNodes: 35, avgMastery: 81, streak: 30, totalTime: 1450, rank: 3 },
  { id: "4", name: "Sam Okonkwo", avatar: "SO", totalNodes: 29, avgMastery: 76, streak: 9, totalTime: 1200, rank: 4 },
];

// ─── Page transition wrapper ──────────────────────────────────────────────────

function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`animate-pageIn min-h-full w-full ${className}`}
      style={{ animation: "pageIn 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
      {children}
    </div>
  );
}

// ─── Input primitives ─────────────────────────────────────────────────────────

function Input({
  label, value, onChange, type = "text", placeholder = "", icon, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; icon?: React.ReactNode; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>
        {label}{required && <span style={{ color: "#ff6b6b" }}> *</span>}
      </span>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused ? "#6c63ff" : "#4a5270" }}>
            {icon}
          </span>
        )}
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-xl border py-3 text-sm outline-none transition-all duration-200"
          style={{
            paddingLeft: icon ? "2.75rem" : "1rem", paddingRight: "1rem",
            background: "#161c30", borderColor: focused ? "#6c63ff88" : "#1e2640",
            color: "#e8eaf0", fontFamily: "'Inter', sans-serif",
            boxShadow: focused ? "0 0 0 3px #6c63ff18" : "none",
          }} />
      </div>
    </label>
  );
}

function Btn({
  children, onClick, variant = "primary", full = false, type = "button", disabled = false,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline";
  full?: boolean; type?: "button" | "submit"; disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff" },
    ghost: { background: "transparent", color: "#4a5270", border: "1px solid #1e2640" },
    outline: { background: "transparent", color: "#6c63ff", border: "1px solid #6c63ff55" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${full ? "w-full" : ""}`}
      style={{
        fontFamily: "'Outfit', sans-serif",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...styles[variant],
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = "1"; }}>
      {children}
    </button>
  );
}

// ─── Logo mark ────────────────────────────────────────────────────────────────

function Logo({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 20px #6c63ff44",
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
      </svg>
    </div>
  );
}

// ─── Landing Screen ───────────────────────────────────────────────────────────

function LandingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const features = [
    { icon: "🌿", title: "Visual Knowledge Tree", desc: "Map your learning as interconnected branches — see how concepts relate at a glance." },
    { icon: "📊", title: "Mastery Tracking", desc: "Track your progress from Beginner to Expert for every topic you study." },
    { icon: "⏱", title: "Time Analytics", desc: "Log study sessions and see exactly where your time goes across subjects." },
    { icon: "🏆", title: "Leaderboard", desc: "Compete with peers, celebrate streaks, and stay motivated as you climb the ranks." },
  ];

  return (
    <Page>
      <div className="min-h-full flex flex-col" style={{ background: "#080b14" }}>
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "#1e2640" }}>
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "#e8eaf0" }}>StudyTree</span>
          </div>
          <div className="flex items-center gap-3">
            <Btn variant="ghost" onClick={() => onNavigate("login")}>Sign In</Btn>
            <Btn onClick={() => onNavigate("signup")}>Get Started</Btn>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          {/* Animated glow orb */}
          <div className="relative mb-10">
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              background: "radial-gradient(circle at 40% 40%, #6c63ff, #0f0a2e)",
              boxShadow: "0 0 80px #6c63ff55, 0 0 160px #6c63ff22",
              animation: "float 6s ease-in-out infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/>
                <line x1="12" y1="7.5" x2="5" y2="16.5"/><line x1="12" y1="7.5" x2="19" y2="16.5"/>
              </svg>
            </div>
            {/* orbiting dots */}
            {[0, 120, 240].map((deg, i) => (
              <div key={i} style={{
                position: "absolute", top: "50%", left: "50%",
                width: 8, height: 8, borderRadius: "50%",
                background: i === 0 ? "#6c63ff" : i === 1 ? "#00e5b0" : "#a78bfa",
                transform: `rotate(${deg}deg) translateX(70px) translateY(-50%)`,
                animation: `orbit 8s linear infinite`,
                animationDelay: `${i * -2.67}s`,
                boxShadow: `0 0 8px currentColor`,
              }} />
            ))}
          </div>

          <div style={{
            display: "inline-block", padding: "4px 14px", borderRadius: 20,
            background: "#6c63ff22", border: "1px solid #6c63ff44",
            marginBottom: 20,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em" }}>
              KNOWLEDGE · STRUCTURED · MASTERED
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "#e8eaf0",
            fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1.1, maxWidth: 700, marginBottom: 20,
          }}>
            Build your mind like a{" "}
            <span style={{ background: "linear-gradient(90deg, #6c63ff, #00e5b0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              tree.
            </span>
          </h1>
          <p style={{ color: "#9098b8", fontSize: 16, maxWidth: 500, lineHeight: 1.7, marginBottom: 36, fontFamily: "'Inter', sans-serif" }}>
            Organize everything you learn as a visual, hierarchical tree. Track mastery, log study time, and watch your knowledge network grow.
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button onClick={() => onNavigate("signup")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-base transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff", fontFamily: "'Outfit', sans-serif", boxShadow: "0 0 30px #6c63ff44" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 40px #6c63ff55"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 30px #6c63ff44"; }}>
              Start for free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => onNavigate("login")}
              style={{ color: "#9098b8", fontFamily: "'Inter', sans-serif", fontSize: 14 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e8eaf0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9098b8")}>
              Already have an account →
            </button>
          </div>
        </section>

        {/* Features grid */}
        <section className="px-8 pb-16 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl border p-5 transition-all duration-300"
                style={{ background: "#0f1424", borderColor: "#1e2640" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6c63ff44"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t px-8 py-4 flex items-center justify-between" style={{ borderColor: "#1e2640" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a5270" }}>© 2026 StudyTree</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a5270" }}>knowledge · structured · mastered</span>
        </footer>
      </div>
    </Page>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onNavigate, onLogin }: { onNavigate: (s: Screen) => void; onLogin: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(email); }, 1200);
  }

  return (
    <Page>
      <div className="min-h-full flex" style={{ background: "#080b14" }}>
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r" style={{ borderColor: "#1e2640", background: "#0a0e1a" }}>
          <button onClick={() => onNavigate("landing")} className="flex items-center gap-3 w-fit">
            <Logo size={32} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#e8eaf0" }}>StudyTree</span>
          </button>
          <div>
            <div className="mb-8">
              {/* Mini tree visualization */}
              <div className="relative w-full h-48 rounded-2xl border overflow-hidden" style={{ borderColor: "#1e2640", background: "#080b14" }}>
                <svg width="100%" height="100%" viewBox="0 0 320 192">
                  <line x1="160" y1="32" x2="80" y2="96" stroke="#6c63ff44" strokeWidth="1.5"/>
                  <line x1="160" y1="32" x2="240" y2="96" stroke="#6c63ff44" strokeWidth="1.5"/>
                  <line x1="80" y1="96" x2="48" y2="160" stroke="#a78bfa44" strokeWidth="1.5"/>
                  <line x1="80" y1="96" x2="112" y2="160" stroke="#a78bfa44" strokeWidth="1.5"/>
                  <line x1="240" y1="96" x2="208" y2="160" stroke="#00e5b044" strokeWidth="1.5"/>
                  <line x1="240" y1="96" x2="272" y2="160" stroke="#00e5b044" strokeWidth="1.5"/>
                  <circle cx="160" cy="32" r="14" fill="#6c63ff22" stroke="#6c63ff" strokeWidth="1.5"/>
                  <text x="160" y="37" textAnchor="middle" fill="#a78bfa" fontSize="11" fontFamily="Outfit">CS</text>
                  <circle cx="80" cy="96" r="12" fill="#6c63ff11" stroke="#a78bfa88" strokeWidth="1.5"/>
                  <text x="80" y="101" textAnchor="middle" fill="#a78bfa" fontSize="10" fontFamily="Outfit">DSA</text>
                  <circle cx="240" cy="96" r="12" fill="#00e5b011" stroke="#00e5b088" strokeWidth="1.5"/>
                  <text x="240" y="101" textAnchor="middle" fill="#00e5b0" fontSize="10" fontFamily="Outfit">Math</text>
                  <circle cx="48" cy="160" r="10" fill="#6c63ff08" stroke="#a78bfa55" strokeWidth="1"/>
                  <circle cx="112" cy="160" r="10" fill="#6c63ff08" stroke="#a78bfa55" strokeWidth="1"/>
                  <circle cx="208" cy="160" r="10" fill="#00e5b008" stroke="#00e5b055" strokeWidth="1"/>
                  <circle cx="272" cy="160" r="10" fill="#00e5b008" stroke="#00e5b055" strokeWidth="1"/>
                </svg>
              </div>
            </div>
            <blockquote>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 600, color: "#e8eaf0", lineHeight: 1.5, marginBottom: 16 }}>
                "The mind is not a vessel to be filled, but a tree to be grown."
              </p>
              <footer style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#4a5270" }}>— StudyTree philosophy</footer>
            </blockquote>
          </div>
          <div className="flex items-center gap-6">
            {[{ v: "2.4k+", l: "students" }, { v: "98%", l: "retention rate" }, { v: "4.9★", l: "rating" }].map(s => (
              <div key={s.l}>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#e8eaf0" }}>{s.v}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270" }}>{s.l.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <button onClick={() => onNavigate("landing")} className="lg:hidden flex items-center gap-2 mb-8"
              style={{ color: "#4a5270", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back
            </button>

            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>Welcome back</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#4a5270", marginBottom: 32 }}>
              Sign in to continue your learning journey.
            </p>

            {error && (
              <div className="rounded-xl border px-4 py-3 mb-5 flex items-center gap-2"
                style={{ background: "#ff6b6b11", borderColor: "#ff6b6b44" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#ff6b6b" }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="EMAIL ADDRESS" value={email} onChange={setEmail} type="email" placeholder="you@university.edu" required
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>} />

              <label className="flex flex-col gap-1.5">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>
                  PASSWORD <span style={{ color: "#ff6b6b" }}>*</span>
                </span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#4a5270" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className="w-full rounded-xl border py-3 text-sm outline-none transition-all"
                    style={{ paddingLeft: "2.75rem", paddingRight: "3rem", background: "#161c30", borderColor: "#1e2640", color: "#e8eaf0", fontFamily: "'Inter', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#6c63ff88"; e.currentTarget.style.boxShadow = "0 0 0 3px #6c63ff18"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.boxShadow = "none"; }} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#4a5270" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#9098b8")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#4a5270")}>
                    {showPass
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </label>

              <div className="flex justify-end">
                <button type="button" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6c63ff" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6c63ff")}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: loading ? "#6c63ff88" : "linear-gradient(135deg, #6c63ff, #a78bfa)",
                  color: "#fff", fontFamily: "'Outfit', sans-serif",
                  boxShadow: "0 0 20px #6c63ff33",
                }}>
                {loading
                  ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span> Signing in…</>
                  : "Sign In"
                }
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: "#1e2640" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270" }}>OR</span>
              <div className="flex-1 h-px" style={{ background: "#1e2640" }} />
            </div>

            <button onClick={() => onLogin("demo@studytree.app")}
              className="w-full rounded-xl py-3 font-semibold text-sm border transition-all duration-200"
              style={{ borderColor: "#1e2640", color: "#9098b8", fontFamily: "'Outfit', sans-serif", background: "#0f1424" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6c63ff44"; e.currentTarget.style.color = "#e8eaf0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.color = "#9098b8"; }}>
              Continue as Guest (Demo)
            </button>

            <p className="text-center mt-6" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270" }}>
              Don't have an account?{" "}
              <button onClick={() => onNavigate("signup")} style={{ color: "#6c63ff" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
                onMouseLeave={e => (e.currentTarget.style.color = "#6c63ff")}>
                Sign up free
              </button>
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}

// ─── Signup Screen ────────────────────────────────────────────────────────────

function SignupScreen({ onNavigate, onSignup }: { onNavigate: (s: Screen) => void; onSignup: (email: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#ff6b6b", "#ffb347", "#6c63ff", "#00e5b0"];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (!agreed) { setError("Please accept the terms to continue."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignup(email); }, 1200);
  }

  return (
    <Page>
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12" style={{ background: "#080b14" }}>
        <div className="w-full max-w-sm">
          <button onClick={() => onNavigate("landing")} className="flex items-center gap-2 mb-8"
            style={{ color: "#4a5270", fontFamily: "'Inter', sans-serif", fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#9098b8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#4a5270")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to home
          </button>

          <div className="flex items-center gap-2 mb-6">
            <Logo size={28} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>StudyTree</span>
          </div>

          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>Create your account</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#4a5270", marginBottom: 28 }}>
            Start building your knowledge tree today — free forever.
          </p>

          {error && (
            <div className="rounded-xl border px-4 py-3 mb-5 flex items-center gap-2"
              style={{ background: "#ff6b6b11", borderColor: "#ff6b6b44" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#ff6b6b" }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="FULL NAME" value={name} onChange={setName} placeholder="Jamie Nguyen" required
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />
            <Input label="EMAIL ADDRESS" value={email} onChange={setEmail} type="email" placeholder="you@university.edu" required
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>} />

            <label className="flex flex-col gap-1.5">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>PASSWORD <span style={{ color: "#ff6b6b" }}>*</span></span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#4a5270" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                  className="w-full rounded-xl border py-3 text-sm outline-none transition-all"
                  style={{ paddingLeft: "2.75rem", paddingRight: "3rem", background: "#161c30", borderColor: "#1e2640", color: "#e8eaf0", fontFamily: "'Inter', sans-serif" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#6c63ff88"; e.currentTarget.style.boxShadow = "0 0 0 3px #6c63ff18"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#4a5270" }}>
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: strength >= i ? strengthColor[strength] : "#1e2640" }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </label>

            <Input label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm} type={showPass ? "text" : "password"} placeholder="Repeat password" required
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={confirm && confirm === password ? "#00e5b0" : "currentColor"} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />

            <label className="flex items-start gap-3 cursor-pointer">
              <div onClick={() => setAgreed(a => !a)}
                className="mt-0.5 w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all"
                style={{ borderColor: agreed ? "#6c63ff" : "#1e2640", background: agreed ? "#6c63ff22" : "transparent" }}>
                {agreed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270", lineHeight: 1.5 }}>
                I agree to the <span style={{ color: "#6c63ff" }}>Terms of Service</span> and <span style={{ color: "#6c63ff" }}>Privacy Policy</span>
              </span>
            </label>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: loading ? "#6c63ff88" : "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff", fontFamily: "'Outfit', sans-serif", boxShadow: "0 0 20px #6c63ff33" }}>
              {loading ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span> Creating account…</> : "Create Account"}
            </button>
          </form>

          <p className="text-center mt-6" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270" }}>
            Already have an account?{" "}
            <button onClick={() => onNavigate("login")} style={{ color: "#6c63ff" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6c63ff")}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </Page>
  );
}

// ─── Profile Setup Screen ─────────────────────────────────────────────────────

function SetupScreen({ email, onComplete }: { email: string; onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  const [username, setUsername] = useState(email.split("@")[0].toLowerCase());
  const [bio, setBio] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [studyGoal, setStudyGoal] = useState(60);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarInitials, setAvatarInitials] = useState("");

  useEffect(() => {
    const parts = name.trim().split(" ");
    setAvatarInitials(parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2) ?? "");
  }, [name]);

  const steps = [
    { label: "Identity", icon: "👤" },
    { label: "Academic", icon: "🎓" },
    { label: "Subjects", icon: "📚" },
    { label: "Goals", icon: "🎯" },
  ];

  function toggleSubject(s: string) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function handleFinish() {
    onComplete({
      name, username, email, avatar: avatarInitials.toUpperCase(),
      bio, grade, school, subjects, studyGoal, streak: 0,
      joinDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }

  return (
    <Page>
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12" style={{ background: "#080b14" }}>
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Logo size={28} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>StudyTree</span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-300"
                      style={{
                        background: i < step ? "#6c63ff" : i === step ? "#6c63ff22" : "#161c30",
                        border: `1px solid ${i <= step ? "#6c63ff" : "#1e2640"}`,
                        color: i <= step ? (i < step ? "#fff" : "#6c63ff") : "#4a5270",
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                      }}>
                      {i < step ? "✓" : i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 h-px transition-all duration-500"
                        style={{ background: i < step ? "#6c63ff" : "#1e2640" }} />
                    )}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: i === step ? "#a78bfa" : "#4a5270", letterSpacing: "0.08em" }}>
                    {s.label.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Step panels */}
          <div className="rounded-2xl border p-7 mb-5" style={{ background: "#0f1424", borderColor: "#1e2640", minHeight: 340 }}>

            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="animate-fadeSlideIn flex flex-col gap-5">
                <div>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>👤 Set up your identity</h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270" }}>How you'll appear to other students</p>
                </div>

                {/* Avatar picker */}
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all"
                    style={{ background: `${avatarColor}33`, border: `2px solid ${avatarColor}88`, color: avatarColor, fontFamily: "'Outfit', sans-serif" }}>
                    {avatarInitials.toUpperCase() || "?"}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>AVATAR COLOR</span>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => setAvatarColor(c)}
                          className="w-6 h-6 rounded-full transition-all"
                          style={{ background: c, outline: avatarColor === c ? `2px solid ${c}` : "none", outlineOffset: 2, transform: avatarColor === c ? "scale(1.25)" : "scale(1)" }} />
                      ))}
                    </div>
                  </div>
                </div>

                <Input label="DISPLAY NAME" value={name} onChange={setName} placeholder="Jamie Nguyen" required
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />
                <Input label="USERNAME" value={username} onChange={setUsername} placeholder="jamie_learns" required
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} />

                <label className="flex flex-col gap-1.5">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>SHORT BIO</span>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                    placeholder="CS student, coffee addict, trying to understand life one node at a time..."
                    className="rounded-xl border px-4 py-3 text-sm outline-none resize-none transition-all"
                    style={{ background: "#161c30", borderColor: "#1e2640", color: "#e8eaf0", fontFamily: "'Inter', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#6c63ff88"; e.currentTarget.style.boxShadow = "0 0 0 3px #6c63ff18"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.boxShadow = "none"; }} />
                </label>
              </div>
            )}

            {/* Step 1: Academic */}
            {step === 1 && (
              <div className="animate-fadeSlideIn flex flex-col gap-5">
                <div>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>🎓 Academic background</h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270" }}>Help us personalize your experience</p>
                </div>
                <Input label="SCHOOL / UNIVERSITY" value={school} onChange={setSchool} placeholder="MIT, Harvard, Stanford..."
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
                <div className="flex flex-col gap-1.5">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>GRADE / YEAR</span>
                  <div className="grid grid-cols-2 gap-2">
                    {GRADES.map(g => (
                      <button key={g} onClick={() => setGrade(g)}
                        className="rounded-xl border px-3 py-2.5 text-sm text-left transition-all duration-200"
                        style={{
                          background: grade === g ? "#6c63ff22" : "#161c30",
                          borderColor: grade === g ? "#6c63ff88" : "#1e2640",
                          color: grade === g ? "#a78bfa" : "#9098b8",
                          fontFamily: "'Inter', sans-serif",
                        }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Subjects */}
            {step === 2 && (
              <div className="animate-fadeSlideIn flex flex-col gap-5">
                <div>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>📚 Your subjects</h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270" }}>Select everything you're currently studying</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map(s => (
                    <button key={s} onClick={() => toggleSubject(s)}
                      className="rounded-full border px-4 py-2 text-sm transition-all duration-200"
                      style={{
                        background: subjects.includes(s) ? "#6c63ff22" : "#161c30",
                        borderColor: subjects.includes(s) ? "#6c63ff88" : "#1e2640",
                        color: subjects.includes(s) ? "#a78bfa" : "#9098b8",
                        fontFamily: "'Inter', sans-serif",
                        transform: subjects.includes(s) ? "scale(1.05)" : "scale(1)",
                      }}>
                      {subjects.includes(s) && "✓ "}{s}
                    </button>
                  ))}
                </div>
                {subjects.length > 0 && (
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6c63ff" }}>
                    {subjects.length} subject{subjects.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Goals */}
            {step === 3 && (
              <div className="animate-fadeSlideIn flex flex-col gap-6">
                <div>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>🎯 Set your daily goal</h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270" }}>How much do you want to study per day?</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-end gap-2">
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 48, fontWeight: 800, color: "#6c63ff", lineHeight: 1 }}>{studyGoal}</span>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, color: "#4a5270", marginBottom: 6 }}>min/day</span>
                  </div>
                  <input type="range" min={15} max={300} step={15} value={studyGoal} onChange={e => setStudyGoal(Number(e.target.value))}
                    className="w-full" style={{ accentColor: "#6c63ff" }} />
                  <div className="flex justify-between">
                    {[15, 30, 60, 90, 120, 180, 240, 300].map(v => (
                      <button key={v} onClick={() => setStudyGoal(v)}
                        className="text-xs rounded-lg px-2 py-1 transition-all"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: studyGoal === v ? "#a78bfa" : "#4a5270", background: studyGoal === v ? "#6c63ff22" : "transparent" }}>
                        {v >= 60 ? `${v / 60}h` : `${v}m`}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border p-4" style={{ background: "#161c30", borderColor: "#1e2640" }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9098b8", lineHeight: 1.6 }}>
                      {studyGoal <= 30 && "🌱 Casual learner — a little each day adds up!"}
                      {studyGoal > 30 && studyGoal <= 60 && "📘 Consistent student — great for long-term retention."}
                      {studyGoal > 60 && studyGoal <= 120 && "⚡ Serious learner — you're building strong habits."}
                      {studyGoal > 120 && "🔥 Power studier — intense but effective. Don't forget breaks!"}
                    </p>
                  </div>
                </div>

                {/* Preview card */}
                <div className="rounded-2xl border p-4" style={{ borderColor: "#6c63ff44", background: "#6c63ff11" }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6c63ff", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR PROFILE PREVIEW</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: `${avatarColor}33`, color: avatarColor, fontFamily: "'Outfit', sans-serif" }}>
                      {avatarInitials.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 600, color: "#e8eaf0" }}>{name || "Your Name"}</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a5270" }}>@{username || "username"} · {grade || "Grade not set"}</p>
                    </div>
                  </div>
                  {subjects.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {subjects.slice(0, 4).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: "#6c63ff22", color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                          {s}
                        </span>
                      ))}
                      {subjects.length > 4 && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270" }}>+{subjects.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <Btn variant="ghost" onClick={() => setStep(s => s - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back
              </Btn>
            )}
            <div className="flex-1">
              {step < steps.length - 1
                ? <Btn full onClick={() => setStep(s => s + 1)}>
                    Continue
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Btn>
                : <Btn full onClick={handleFinish}>
                    Launch my StudyTree 🚀
                  </Btn>
              }
            </div>
          </div>

          {step < steps.length - 1 && (
            <button onClick={handleFinish} className="w-full text-center mt-3 text-xs transition-colors"
              style={{ fontFamily: "'Inter', sans-serif", color: "#4a5270" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#9098b8")}
              onMouseLeave={e => (e.currentTarget.style.color = "#4a5270")}>
              Skip setup for now
            </button>
          )}
        </div>
      </div>
    </Page>
  );
}

// ─── Main App (Study Tree + Leaderboard) ──────────────────────────────────────

type ModalState =
  | { type: "edit"; node: StudyNode }
  | { type: "addRoot" }
  | { type: "addChild"; parentId: string; parentColor: string }
  | null;

function toggleNode(tree: StudyNode[], id: string): StudyNode[] {
  return tree.map(n => n.id === id ? { ...n, expanded: !n.expanded } : { ...n, children: toggleNode(n.children, id) });
}
function updateNode(tree: StudyNode[], updated: StudyNode): StudyNode[] {
  return tree.map(n => n.id === updated.id ? updated : { ...n, children: updateNode(n.children, updated) });
}
function deleteNode(tree: StudyNode[], id: string): StudyNode[] {
  return tree.filter(n => n.id !== id).map(n => ({ ...n, children: deleteNode(n.children, id) }));
}
function addChildNode(tree: StudyNode[], parentId: string, child: StudyNode): StudyNode[] {
  return tree.map(n => n.id === parentId ? { ...n, children: [...n.children, child], expanded: true } : { ...n, children: addChildNode(n.children, parentId, child) });
}
function flattenTree(tree: StudyNode[]): StudyNode[] {
  return tree.flatMap(n => [n, ...flattenTree(n.children)]);
}

function masteryColor2(m: number) { return masteryColor(m); }

function NodeModal({ node, parentColor, onSave, onClose, isNew }: {
  node: StudyNode | null; parentColor?: string; onSave: (n: StudyNode) => void; onClose: () => void; isNew?: boolean;
}) {
  const defaultColor = parentColor ?? NODE_COLORS[0];
  const [title, setTitle] = useState(node?.title ?? "");
  const [desc, setDesc] = useState(node?.description ?? "");
  const [mastery, setMastery] = useState(node?.mastery ?? 0);
  const [timeSpent, setTimeSpent] = useState(node?.timeSpent ?? 0);
  const [tags, setTags] = useState((node?.tags ?? []).join(", "));
  const [color, setColor] = useState(node?.color ?? defaultColor);

  function handleSave() {
    if (!title.trim()) return;
    onSave({ id: node?.id ?? uid(), title: title.trim(), description: desc.trim(), mastery, timeSpent, color, tags: tags.split(",").map(t => t.trim()).filter(Boolean), lastStudied: "Just now", expanded: node?.expanded ?? false, children: node?.children ?? [] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(8,11,20,0.85)", backdropFilter: "blur(8px)", animation: "pageIn 0.2s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-5"
        style={{ background: "#0f1424", borderColor: "#1e2640", animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#e8eaf0" }}>{isNew ? "Add Study Node" : "Edit Node"}</h2>
          <button onClick={onClose} style={{ color: "#4a5270" }} onMouseEnter={e => (e.currentTarget.style.color = "#e8eaf0")} onMouseLeave={e => (e.currentTarget.style.color = "#4a5270")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Input label="TOPIC TITLE" value={title} onChange={setTitle} placeholder="e.g. Linear Algebra" required />
          <label className="flex flex-col gap-1.5">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>DESCRIPTION</span>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What does this cover?"
              className="rounded-xl border px-4 py-2.5 text-sm outline-none resize-none"
              style={{ background: "#161c30", borderColor: "#1e2640", color: "#e8eaf0", fontFamily: "'Inter', sans-serif" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#6c63ff88")} onBlur={e => (e.currentTarget.style.borderColor = "#1e2640")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>MASTERY %</span>
              <div className="flex flex-col gap-1">
                <input type="range" min={0} max={100} value={mastery} onChange={e => setMastery(Number(e.target.value))} className="w-full" style={{ accentColor: masteryColor2(mastery) }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: masteryColor2(mastery) }}>{mastery}% · {masteryLabel(mastery)}</span>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>TIME (MINS)</span>
              <input type="number" min={0} value={timeSpent} onChange={e => setTimeSpent(Number(e.target.value))}
                className="rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{ background: "#161c30", borderColor: "#1e2640", color: "#e8eaf0", fontFamily: "'JetBrains Mono', monospace" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6c63ff88")} onBlur={e => (e.currentTarget.style.borderColor = "#1e2640")} />
            </label>
          </div>
          <Input label="TAGS (comma-separated)" value={tags} onChange={setTags} placeholder="math, core, review" />
          <div className="flex flex-col gap-1.5">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>NODE COLOR</span>
            <div className="flex gap-2 flex-wrap">
              {NODE_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2, transform: color === c ? "scale(1.2)" : "scale(1)" }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn full onClick={handleSave}>{isNew ? "Add Node" : "Save Changes"}</Btn>
        </div>
      </div>
    </div>
  );
}

function TreeNodeItem({ node, depth, onToggle, onEdit, onAddChild, onDelete, isLast }: {
  node: StudyNode; depth: number; onToggle: (id: string) => void; onEdit: (n: StudyNode) => void;
  onAddChild: (pid: string) => void; onDelete: (id: string) => void; isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative" style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      {depth > 0 && <div className="absolute" style={{ left: -16, top: 22, width: 16, height: 1, background: `${node.color}44` }} />}
      {depth > 0 && !isLast && <div className="absolute" style={{ left: -16, top: 0, width: 1, height: "100%", background: `${node.color}22` }} />}

      <div className="mb-2 rounded-xl border cursor-pointer transition-all duration-200"
        style={{ borderColor: hovered ? `${node.color}55` : "#1e2640", background: hovered ? "#161c30" : "#0f1424" }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => hasChildren && onToggle(node.id)}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: hasChildren ? `${node.color}22` : "transparent", color: hasChildren ? node.color : "#1e2640", cursor: hasChildren ? "pointer" : "default" }}>
            {hasChildren
              ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: node.expanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              : <div className="w-1.5 h-1.5 rounded-full" style={{ background: node.color }} />
            }
          </button>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: node.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>{node.title}</span>
              {node.tags.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded"
                  style={{ background: `${node.color}22`, color: node.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{t}</span>
              ))}
            </div>
            {node.description && <p className="text-xs mt-0.5 truncate" style={{ color: "#4a5270" }}>{node.description}</p>}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e2640" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${node.mastery}%`, background: masteryColor(node.mastery) }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: masteryColor(node.mastery) }}>{node.mastery}%</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270" }}>{fmtTime(node.timeSpent)} · {node.lastStudied}</span>
            </div>
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}>
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>, onClick: () => onAddChild(node.id), hover: { bg: "#6c63ff22", color: "#6c63ff" } },
                { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, onClick: () => onEdit(node), hover: { bg: "#00e5b022", color: "#00e5b0" } },
                { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>, onClick: () => onDelete(node.id), hover: { bg: "#ff6b6b22", color: "#ff6b6b" } },
              ].map((a, i) => (
                <button key={i} onClick={a.onClick} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: "#4a5270" }}
                  onMouseEnter={e => { e.currentTarget.style.background = a.hover.bg; e.currentTarget.style.color = a.hover.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4a5270"; }}>
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {node.expanded && node.children.length > 0 && (
        <div style={{ animation: "nodeExpand 0.35s ease forwards", overflow: "hidden", paddingLeft: 16, borderLeft: `1px solid ${node.color}22` }}>
          {node.children.map((child, i) => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} onToggle={onToggle} onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete} isLast={i === node.children.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MainApp({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const [tree, setTree] = useState<StudyNode[]>([]);
  const [tab, setTab] = useState<"tree" | "leaderboard" | "profile">("tree");
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState("");
  const [tabKey, setTabKey] = useState(0);
  const prevTab = useRef(tab);

  useEffect(() => { if (prevTab.current !== tab) { setTabKey(k => k + 1); prevTab.current = tab; } }, [tab]);

  const allNodes = flattenTree(tree);
  const avg = allNodes.length ? Math.round(allNodes.reduce((s, n) => s + n.mastery, 0) / allNodes.length) : 0;
  const totalTime = allNodes.reduce((s, n) => s + n.timeSpent, 0);

  const filtered = search.trim() ? allNodes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase())
  ) : null;

  const leaders: LeaderEntry[] = [
    ...INITIAL_LEADERS,
    { id: "me", name: profile.name, avatar: profile.avatar, totalNodes: allNodes.length, avgMastery: avg || 0, streak: profile.streak, totalTime, rank: 5 },
  ].sort((a, b) => b.avgMastery - a.avgMastery).map((l, i) => ({ ...l, rank: i + 1 }));

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#080b14" }}>
      {/* Header */}
      <header className="border-b px-6 py-3.5 flex items-center gap-4 sticky top-0 z-40"
        style={{ borderColor: "#1e2640", background: "rgba(8,11,20,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3 mr-auto">
          <Logo size={30} />
          <div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: "#e8eaf0" }}>StudyTree</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", marginLeft: 8 }}>@{profile.username}</span>
          </div>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a5270" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics…"
            className="pl-8 pr-4 py-2 rounded-xl border text-sm outline-none transition-all"
            style={{ background: "#0f1424", borderColor: "#1e2640", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", width: 180 }}
            onFocus={e => { e.currentTarget.style.borderColor = "#6c63ff88"; e.currentTarget.style.width = "220px"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.width = "180px"; }} />
        </div>

        <nav className="flex gap-1 rounded-xl border p-1" style={{ borderColor: "#1e2640", background: "#0f1424" }}>
          {(["tree", "leaderboard", "profile"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200"
              style={{
                fontFamily: "'Outfit', sans-serif", borderColor: "transparent",
                background: tab === t ? "#6c63ff22" : "transparent",
                color: tab === t ? "#e8eaf0" : "#4a5270",
                borderColor: tab === t ? "#6c63ff55" : "transparent",
              }}>
              {t === "tree" ? "Tree" : t === "leaderboard" ? "Leaderboard" : "Profile"}
            </button>
          ))}
        </nav>

        {tab === "tree" && (
          <button onClick={() => setModal({ type: "addRoot" })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff", fontFamily: "'Outfit', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Topic
          </button>
        )}

        {/* Avatar */}
        <button onClick={() => setTab("profile")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all"
          style={{ background: `${profile.avatar ? AVATAR_COLORS[0] : "#6c63ff"}33`, color: AVATAR_COLORS[0], fontFamily: "'Outfit', sans-serif", border: "1px solid #6c63ff33" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#6c63ff88")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#6c63ff33")}>
          {profile.avatar}
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">

        {/* Tree tab */}
        {tab === "tree" && (
          <div key={tabKey} style={{ animation: "pageIn 0.35s ease" }}>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "NODES", value: allNodes.length, color: "#6c63ff" },
                { label: "AVG MASTERY", value: `${avg}%`, color: masteryColor(avg) },
                { label: "STUDY TIME", value: fmtTime(totalTime), color: "#00e5b0" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border p-4 transition-all duration-200"
                  style={{ background: "#0f1424", borderColor: "#1e2640" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${s.color}44`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e2640")}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>{s.label}</p>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Search results */}
            {search && filtered !== null && (
              <div className="mb-6">
                <p className="mb-3" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a5270" }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
                </p>
                {filtered.length === 0
                  ? <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "#1e2640" }}><p style={{ color: "#4a5270" }}>No topics match.</p></div>
                  : filtered.map(n => (
                    <div key={n.id} className="mb-2 rounded-xl border px-4 py-3 flex items-center gap-3 transition-all"
                      style={{ borderColor: "#1e2640", background: "#0f1424" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${n.color}44`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e2640")}>
                      <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                      <div className="flex-1">
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>{n.title}</span>
                        {n.description && <p className="text-xs" style={{ color: "#4a5270" }}>{n.description}</p>}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: masteryColor(n.mastery) }}>{n.mastery}%</span>
                      <button onClick={() => setModal({ type: "edit", node: n })}
                        className="px-3 py-1 rounded-lg text-xs border transition-colors"
                        style={{ borderColor: "#1e2640", color: "#4a5270" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#00e5b055"; e.currentTarget.style.color = "#00e5b0"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.color = "#4a5270"; }}>
                        Edit
                      </button>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Empty state */}
            {!search && tree.length === 0 && (
              <div className="rounded-2xl border p-16 text-center flex flex-col items-center gap-5"
                style={{ borderColor: "#1e2640", borderStyle: "dashed" }}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6c63ff22, #00e5b011)" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1.5">
                    <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
                    <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#e8eaf0" }}>
                    Hey {profile.name.split(" ")[0]}, your tree is empty
                  </p>
                  <p style={{ color: "#4a5270", fontSize: 14, marginTop: 6 }}>
                    Add your first topic to start building your knowledge tree.
                  </p>
                  {profile.subjects.length > 0 && (
                    <p style={{ color: "#6c63ff", fontSize: 13, marginTop: 4 }}>
                      You study: {profile.subjects.slice(0, 3).join(", ")}{profile.subjects.length > 3 ? ` +${profile.subjects.length - 3} more` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {profile.subjects.slice(0, 4).map((s, i) => (
                    <button key={s} onClick={() => {
                      const newNode: StudyNode = { id: uid(), title: s, description: `My ${s} study tree`, mastery: 0, timeSpent: 0, children: [], expanded: false, color: pickColor(i), tags: [], lastStudied: "Just now" };
                      setTree(t => [...t, newNode]);
                    }}
                      className="px-4 py-2 rounded-xl border text-sm transition-all"
                      style={{ borderColor: `${pickColor(i)}55`, color: pickColor(i), background: `${pickColor(i)}11`, fontFamily: "'Outfit', sans-serif" }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${pickColor(i)}22`)}
                      onMouseLeave={e => (e.currentTarget.style.background = `${pickColor(i)}11`)}>
                      + Add {s}
                    </button>
                  ))}
                  <button onClick={() => setModal({ type: "addRoot" })}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
                    + Custom Topic
                  </button>
                </div>
              </div>
            )}

            {/* Tree */}
            {!search && tree.map((node, i) => (
              <TreeNodeItem key={node.id} node={node} depth={0}
                onToggle={id => setTree(t => toggleNode(t, id))}
                onEdit={n => setModal({ type: "edit", node: n })}
                onAddChild={parentId => {
                  const parent = flattenTree(tree).find(n => n.id === parentId);
                  setModal({ type: "addChild", parentId, parentColor: parent?.color ?? "#6c63ff" });
                }}
                onDelete={id => setTree(t => deleteNode(t, id))}
                isLast={i === tree.length - 1} />
            ))}
          </div>
        )}

        {/* Leaderboard */}
        {tab === "leaderboard" && (
          <div key={tabKey + 100} style={{ animation: "pageIn 0.35s ease" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0" }}>Leaderboard</h2>
                <p style={{ fontSize: 13, color: "#4a5270" }}>Top learners this month</p>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-3 mb-6">
              {leaders.slice(0, 3).map(l => {
                const medals: Record<number, string> = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
                const c = medals[l.rank];
                const isMe = l.name === profile.name;
                return (
                  <div key={l.id} className="rounded-2xl border p-5 flex flex-col items-center gap-3 transition-all duration-300"
                    style={{ background: l.rank === 1 ? "linear-gradient(135deg, #1a1530, #0f1424)" : "#0f1424", borderColor: `${c}44`, boxShadow: l.rank === 1 ? `0 0 30px ${c}22` : "none" }}>
                    <div className="text-2xl">{l.rank === 1 ? "🥇" : l.rank === 2 ? "🥈" : "🥉"}</div>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `${c}44`, color: c, fontFamily: "'Outfit', sans-serif", border: `1px solid ${c}55` }}>
                      {l.avatar}
                    </div>
                    <div className="text-center">
                      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: isMe ? "#a78bfa" : "#e8eaf0" }}>
                        {l.name}{isMe ? " (you)" : ""}
                      </p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: masteryColor(l.avgMastery) }}>{l.avgMastery}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#1e2640" }}>
              {leaders.slice(3).map((l, i) => {
                const isMe = l.name === profile.name;
                return (
                  <div key={l.id} className="flex items-center gap-4 px-5 py-4 transition-colors"
                    style={{ background: isMe ? "#6c63ff11" : "transparent", borderBottom: i < leaders.length - 4 ? "1px solid #1e2640" : "none" }}
                    onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = "#161c30"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isMe ? "#6c63ff11" : "transparent"; }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#4a5270", width: 24, textAlign: "center" }}>#{l.rank}</span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: isMe ? "#6c63ff33" : "#161c30", color: isMe ? "#a78bfa" : "#9098b8", fontFamily: "'Outfit', sans-serif" }}>
                      {l.avatar}
                    </div>
                    <div className="flex-1">
                      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: isMe ? "#a78bfa" : "#e8eaf0" }}>
                        {l.name}{isMe ? " ← you" : ""}
                      </p>
                    </div>
                    {[
                      { v: `${l.avgMastery}%`, c: masteryColor(l.avgMastery), l: "MASTERY" },
                      { v: l.totalNodes, c: "#9098b8", l: "NODES" },
                      { v: `${l.streak}d 🔥`, c: "#ffb347", l: "STREAK" },
                    ].map(s => (
                      <div key={s.l} className="text-right">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: s.c }}>{s.v}</p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a5270" }}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile */}
        {tab === "profile" && (
          <div key={tabKey + 200} style={{ animation: "pageIn 0.35s ease" }}>
            <div className="grid grid-cols-3 gap-6">
              {/* Left: profile card */}
              <div className="col-span-1 flex flex-col gap-4">
                <div className="rounded-2xl border p-6 flex flex-col items-center gap-4" style={{ background: "#0f1424", borderColor: "#1e2640" }}>
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
                    style={{ background: `${AVATAR_COLORS[0]}33`, color: AVATAR_COLORS[0], fontFamily: "'Outfit', sans-serif", border: `2px solid ${AVATAR_COLORS[0]}55`, boxShadow: `0 0 20px ${AVATAR_COLORS[0]}33` }}>
                    {profile.avatar}
                  </div>
                  <div className="text-center">
                    <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#e8eaf0" }}>{profile.name}</h2>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6c63ff" }}>@{profile.username}</p>
                    {profile.bio && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5270", marginTop: 8, lineHeight: 1.5 }}>{profile.bio}</p>}
                  </div>
                  <div className="w-full border-t pt-4 flex flex-col gap-2" style={{ borderColor: "#1e2640" }}>
                    {profile.grade && (
                      <div className="flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a5270" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9098b8" }}>{profile.grade}</span>
                      </div>
                    )}
                    {profile.school && (
                      <div className="flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a5270" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9098b8" }}>{profile.school}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a5270" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9098b8" }}>Joined {profile.joinDate}</span>
                    </div>
                  </div>
                  <button onClick={onSignOut} className="w-full rounded-xl border py-2 text-sm transition-all"
                    style={{ borderColor: "#1e2640", color: "#4a5270", fontFamily: "'Outfit', sans-serif" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#ff6b6b44"; e.currentTarget.style.color = "#ff6b6b"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2640"; e.currentTarget.style.color = "#4a5270"; }}>
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Right: stats + subjects */}
              <div className="col-span-2 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "STUDY NODES", value: allNodes.length, color: "#6c63ff", icon: "🌿" },
                    { label: "AVG MASTERY", value: `${avg}%`, color: masteryColor(avg), icon: "📊" },
                    { label: "TOTAL TIME", value: fmtTime(totalTime), color: "#00e5b0", icon: "⏱" },
                    { label: "DAILY GOAL", value: `${profile.studyGoal}m`, color: "#ffb347", icon: "🎯" },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl border p-5 transition-all"
                      style={{ background: "#0f1424", borderColor: "#1e2640" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${s.color}44`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e2640")}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{s.icon}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>{s.label}</span>
                      </div>
                      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {profile.subjects.length > 0 && (
                  <div className="rounded-2xl border p-5" style={{ background: "#0f1424", borderColor: "#1e2640" }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em", marginBottom: 12 }}>STUDYING</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.subjects.map((s, i) => (
                        <span key={s} className="px-3 py-1.5 rounded-full text-sm"
                          style={{ background: `${pickColor(i)}22`, color: pickColor(i), border: `1px solid ${pickColor(i)}44`, fontFamily: "'Inter', sans-serif" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily goal progress */}
                <div className="rounded-2xl border p-5" style={{ background: "#0f1424", borderColor: "#1e2640" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5270", letterSpacing: "0.1em" }}>TODAY'S PROGRESS</p>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#9098b8" }}>
                      {Math.min(totalTime, profile.studyGoal)}/{profile.studyGoal}m
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1e2640" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, profile.studyGoal > 0 ? (totalTime / profile.studyGoal) * 100 : 0)}%`,
                        background: "linear-gradient(90deg, #6c63ff, #00e5b0)",
                      }} />
                  </div>
                  {totalTime >= profile.studyGoal && profile.studyGoal > 0 && (
                    <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#00e5b0", marginTop: 8 }}>
                      🎉 Daily goal reached!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Node modal */}
      {modal && (
        <NodeModal
          node={modal.type === "edit" ? modal.node : null}
          parentColor={modal.type === "addChild" ? modal.parentColor : undefined}
          isNew={modal.type !== "edit"}
          onSave={node => {
            if (modal.type === "edit") setTree(t => updateNode(t, node));
            else if (modal.type === "addRoot") setTree(t => [...t, node]);
            else if (modal.type === "addChild") setTree(t => addChildNode(t, modal.parentId, node));
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [pendingEmail, setPendingEmail] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  function navigate(s: Screen) { setScreen(s); }

  function handleLogin(email: string) {
    setPendingEmail(email);
    setScreen("setup");
  }

  function handleSignup(email: string) {
    setPendingEmail(email);
    setScreen("setup");
  }

  function handleSetupComplete(p: UserProfile) {
    setProfile(p);
    setScreen("app");
  }

  function handleSignOut() {
    setProfile(null);
    setPendingEmail("");
    setScreen("landing");
  }

  return (
    <div style={{ minHeight: "100%", background: "#080b14" }}>
      {screen === "landing" && <LandingScreen onNavigate={navigate} />}
      {screen === "login" && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {screen === "signup" && <SignupScreen onNavigate={navigate} onSignup={handleSignup} />}
      {screen === "setup" && <SetupScreen email={pendingEmail} onComplete={handleSetupComplete} />}
      {screen === "app" && profile && <MainApp profile={profile} onSignOut={handleSignOut} />}
    </div>
  );
}
