import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function formatError(detail) {
  if (!detail) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function Auth() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "register" ? "register" : "login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({ name: "", email: "", password: "" });

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const redirect = params.get("redirect") || "dashboard";
      navigate(`/${redirect}`);
    }
  }, [user, navigate, params]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (regData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(regData.name, regData.email, regData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #020617 0%, #0F172A 50%, #020617 100%)" }}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-6 py-12">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
          data-testid="back-to-home-btn"
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              Hynexs Edu Counseller
            </p>
            <p className="text-slate-400 text-xs">AI-powered college predictions</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-lg p-1 mb-8">
            <button
              data-testid="login-tab"
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === "login" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              data-testid="register-tab"
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === "register" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              data-testid="auth-error"
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm"
            >
              {error}
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            data-testid="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-medium py-3 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 mb-4 text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.51 8.18c0-.57-.05-1.13-.15-1.66H9v3.13h4.21a3.6 3.6 0 0 1-1.56 2.36v1.97h2.53c1.48-1.37 2.33-3.38 2.33-5.8z" fill="#4285F4"/>
              <path d="M9 17c2.1 0 3.87-.7 5.18-1.9l-2.53-1.97c-.7.47-1.6.75-2.65.75-2.04 0-3.76-1.37-4.38-3.23H2v2.03A8 8 0 0 0 9 17z" fill="#34A853"/>
              <path d="M4.62 10.65a4.8 4.8 0 0 1 0-3.07V5.55H2a8 8 0 0 0 0 6.9l2.62-1.8z" fill="#FBBC04"/>
              <path d="M9 4.62c1.15 0 2.18.4 2.99 1.17l2.24-2.24A8 8 0 0 0 2 5.55l2.62 2.03C5.24 5.74 6.96 4.62 9 4.62z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Email</label>
                <input
                  data-testid="login-email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Password</label>
                <div className="relative">
                  <input
                    data-testid="login-password"
                    type={showPass ? "text" : "password"}
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Full Name</label>
                <input
                  data-testid="register-name"
                  type="text"
                  required
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="Ravi Kumar"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Email</label>
                <input
                  data-testid="register-email"
                  type="email"
                  required
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Password</label>
                <div className="relative">
                  <input
                    data-testid="register-password"
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                data-testid="register-submit-btn"
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          <p className="text-center text-slate-500 text-xs mt-6">
            By continuing, you agree to our{" "}
            <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}
