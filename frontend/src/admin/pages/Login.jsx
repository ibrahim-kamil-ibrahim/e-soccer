import { useEffect, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { ShieldCheck, Lock, User, Loader2, ArrowLeft, Sun, Moon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

function InlineThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-[#64748B] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.backgroundImage = "none";
    document.body.style.backgroundColor = "#ffffff";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  if (user) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="es-admin-root"
      className="min-h-screen flex items-center justify-center px-4 bg-white relative overflow-hidden"
    >
      <div className="absolute top-4 right-4 z-10">
        <InlineThemeToggle />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,163,74,0.08),transparent_55%)]" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-green-dim)] border border-[#16A34A]/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-[#22C55E]" />
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)] tracking-tight">
            E-Soccer Admin
          </h1>
          <p className="text-sm text-[#64748B] mt-1">Sign in to the management console</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl shadow-black/5"
        >
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 text-[#F87171] text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-white border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#16A34A]/60"
                placeholder="ibro"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#16A34A]/60"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-4 px-4 py-3 rounded-lg bg-[var(--color-surface-dim)] border border-dashed border-[var(--color-border)] text-xs text-[#64748B] leading-relaxed">
            <strong className="text-[#64748B]">Demo logins</strong>
            <br />
            ibro / 12341234 (Super Admin)
            <br />
            admin@esoccer.et / admin1234 (Super Admin)
            <br />
            editor@esoccer.et / editor1234 (Editor)
          </div>
        </form>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
