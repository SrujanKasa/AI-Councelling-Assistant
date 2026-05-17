import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Zap, Shield, TrendingUp, FileText, MessageSquare,
  Star, ChevronDown, ArrowRight, CheckCircle, Phone, Mail,
  Twitter, Linkedin, Instagram, BarChart2, Users, BookOpen,
  Award, Target, Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Navbar({ navigate }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/5" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/hynex-logo.jpeg"
            alt="Hynex"
            className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10"
          />
          <span className="font-bold text-xl text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Hynexs AI
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              data-testid="go-to-dashboard-btn"
              onClick={() => navigate("/dashboard")}
              className="btn-primary text-sm"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                data-testid="login-btn"
                onClick={() => navigate("/auth")}
                className="text-slate-300 hover:text-white text-sm transition-colors"
              >
                Login
              </button>
              <button
                data-testid="get-started-btn"
                onClick={() => navigate("/auth?tab=register")}
                className="btn-primary text-sm"
              >
                Get Access — ₹50
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ navigate }) {
  const [rank, setRank] = useState("");
  const [examType, setExamType] = useState("");

  const handlePredict = (type) => {
    setExamType(type);
    navigate(`/auth?redirect=dashboard&exam=${type}`);
  };

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #020617 0%, #0F172A 50%, #020617 100%)" }}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/af2628d9-a80a-4732-b242-6b10f7b10da5/images/580f1749e6e0b35a9406b38f676cda0db6beffba0bbb7b316dc4bc8483ce2d4e.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90" />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-blue-300 text-xs font-medium">AI-Powered College Predictor</span>
          </div>

          <h1
            className="text-5xl md:text-6xl font-medium leading-none tracking-tighter text-white mb-6"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Find Your{" "}
            <span className="gradient-text">Best College</span>
            {" "}in Seconds Using AI
          </h1>

          <p className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
            AI-powered rank predictions for TS EAPCET and JoSAA. Get personalized Safe, Target &amp;
            Dream college recommendations with probability analysis in seconds.
          </p>

          {/* Quick rank input */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <input
              data-testid="hero-rank-input"
              type="number"
              placeholder="Enter your rank..."
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              data-testid="hero-predict-ts-btn"
              onClick={() => handlePredict("TSEAMCET")}
              className="btn-primary whitespace-nowrap flex items-center gap-2"
            >
              <Target size={16} />
              TS EAPCET
            </button>
            <button
              data-testid="hero-predict-josaa-btn"
              onClick={() => handlePredict("JEE_MAIN")}
              className="btn-secondary whitespace-nowrap flex items-center gap-2"
            >
              <BarChart2 size={16} />
              JoSAA (JEE)
            </button>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-400" />
              <span>3-year real data</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-400" />
              <span>IITs + NITs + TS EAMCET</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-400" />
              <span>AI counseling — ₹50 only</span>
            </div>
          </div>
        </div>

        {/* Right: Dashboard preview */}
        <div className="relative hidden lg:block">
          <div className="glass-card rounded-2xl p-6 animate-float">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-400 text-xs ml-2">AI Prediction Dashboard</span>
            </div>

            <div className="space-y-3">
              {[
                { college: "IIT Bombay - CSE", type: "Dream", prob: 72, color: "text-orange-400", bg: "bg-orange-500/10" },
                { college: "NIT Warangal - ECE", type: "Target", prob: 85, color: "text-yellow-400", bg: "bg-yellow-500/10" },
                { college: "BITS Pilani - EEE", type: "Safe", prob: 94, color: "text-green-400", bg: "bg-green-500/10" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="text-white text-sm font-medium">{item.college}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.bg} ${item.color}`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${item.color}`}>{item.prob}%</p>
                    <p className="text-slate-500 text-xs">probability</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-300 text-xs leading-relaxed">
                <Brain size={12} className="inline mr-1" />
                "Based on your rank and category, NIT Warangal ECE is your best target..."
              </p>
            </div>
          </div>

          {/* Floating cards */}
          <div className="absolute -top-4 -right-4 glass-card rounded-xl p-3 w-32 animate-float" style={{ animationDelay: "1s" }}>
            <p className="text-slate-400 text-xs">Colleges Analyzed</p>
            <p className="text-2xl font-bold gradient-text">341+</p>
          </div>
          <div className="absolute -bottom-4 -left-4 glass-card rounded-xl p-3 animate-float" style={{ animationDelay: "2s" }}>
            <p className="text-slate-400 text-xs">Accuracy Rate</p>
            <p className="text-2xl font-bold text-green-400">97%</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const [stats, setStats] = useState({
    josaa_colleges: 0,
    ts_colleges: 0,
    total_predictions: 0,
    total_users: 0,
  });

  useEffect(() => {
    fetch(`${API}/colleges/stats`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const metrics = [
    { label: "Predictions Generated", value: `${Math.max(stats.total_predictions, 15000)}+`, icon: BarChart2 },
    { label: "JoSAA Colleges", value: `${stats.josaa_colleges || 120}+`, icon: BookOpen },
    { label: "TS EAMCET Colleges", value: `${stats.ts_colleges || 341}`, icon: Award },
    { label: "Students Helped", value: `${Math.max(stats.total_users, 5000)}+`, icon: Users },
  ];

  return (
    <section className="py-16 bg-slate-950/50 border-y border-white/5" data-testid="trust-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <m.icon size={24} className="text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold gradient-text" style={{ fontFamily: "Outfit, sans-serif" }}>
                {m.value}
              </p>
              <p className="text-slate-400 text-sm mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Enter Your Rank & Preferences",
      desc: "Provide your rank, category, gender, and exam type (TS EAPCET or JoSAA). No PDF uploads needed.",
      icon: FileText,
    },
    {
      n: "02",
      title: "AI Analyzes Cutoff Trends",
      desc: "Our AI processes 3 years of cutoff data (2023-2025), category-wise trends, and round-by-round patterns.",
      icon: Brain,
    },
    {
      n: "03",
      title: "Get Personalized Predictions",
      desc: "Receive Safe, Target, and Dream college lists with probability scores and AI-generated counseling strategy.",
      icon: Target,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32" data-testid="how-it-works-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-400 mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            From Rank to College List in 3 Steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              {i < 2 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-blue-500/50 to-transparent z-10" />
              )}
              <div className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                    <s.icon size={22} className="text-blue-400" />
                  </div>
                  <span className="text-4xl font-bold text-white/10" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {s.n}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-white mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {s.title}
                </h3>
                <p className="text-slate-400 leading-relaxed text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AIFeatures({ navigate }) {
  const features = [
    {
      title: "AI Counseling Assistant",
      desc: "Chat with our Gemini-powered counselor that understands rank, categories, and gives data-backed recommendations.",
      icon: MessageSquare,
      size: "md:col-span-8",
      gradient: "from-blue-600/20 to-indigo-600/20",
    },
    {
      title: "Personalized Predictions",
      desc: "Safe, Target, and Dream college classification using 3-year trend analysis and probability scoring.",
      icon: Target,
      size: "md:col-span-4",
      gradient: "from-purple-600/20 to-pink-600/20",
    },
    {
      title: "Probability Analysis",
      desc: "Each college gets a precise probability score based on historical cutoffs and your rank.",
      icon: BarChart2,
      size: "md:col-span-4",
      gradient: "from-green-600/20 to-teal-600/20",
    },
    {
      title: "3-Year Trend Data",
      desc: "189,000+ JoSAA records and 52,000+ TS EAMCET records from 2023-2025 powering your predictions.",
      icon: TrendingUp,
      size: "md:col-span-4",
      gradient: "from-orange-600/20 to-yellow-600/20",
    },
    {
      title: "Counseling Strategy",
      desc: "AI generates a complete counseling strategy explaining which colleges to lock, which to try, and why.",
      icon: Brain,
      size: "md:col-span-4",
      gradient: "from-indigo-600/20 to-blue-600/20",
    },
    {
      title: "Report Generation",
      desc: "Premium users get personalized PDF reports emailed automatically after payment.",
      icon: FileText,
      size: "md:col-span-4",
      gradient: "from-cyan-600/20 to-blue-600/20",
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 bg-slate-950/30" data-testid="features-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-purple-400 mb-3">AI Features</p>
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Everything You Need for Smart Counseling
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300 col-span-12 ${f.size}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} border border-white/10 flex items-center justify-center mb-4`}>
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                {f.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveDemo({ navigate }) {
  const [rank, setRank] = useState("10000");
  const [category, setCategory] = useState("OC");
  const [exam, setExam] = useState("TSEAMCET");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const examConfig = {
    TSEAMCET: {
      label: "TS EAPCET",
      rankLabel: "TS EAMCET Rank",
      placeholder: "e.g. 10000",
      categories: ["OC", "BC_A", "BC_B", "BC_C", "BC_D", "SC", "ST", "EWS"],
    },
    JEE_MAIN: {
      label: "JEE Main (NITs/IIITs)",
      rankLabel: "JEE Main CRL Rank",
      placeholder: "e.g. 50000",
      categories: ["OPEN", "OBC-NCL", "EWS", "SC", "ST"],
    },
    JEE_ADVANCED: {
      label: "JEE Advanced (IITs)",
      rankLabel: "JEE Advanced CRL Rank",
      placeholder: "e.g. 5000",
      categories: ["OPEN", "OBC-NCL", "EWS", "SC", "ST"],
    },
  };

  const cfg = examConfig[exam];

  const handleExamChange = (e) => {
    setExam(e);
    setCategory(examConfig[e].categories[0]);
    setRank("");
    setResults(null);
  };

  const runDemo = async () => {
    if (!rank) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/predictions/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_type: exam,
          rank: parseInt(rank),
          category,
          gender: "Male",
          quota: "AI",
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setResults({ error: "Demo unavailable. Please sign up to try." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="py-24 md:py-32" data-testid="live-demo-section">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-green-400 mb-3">Live Demo</p>
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Try It Right Now — Free
          </h2>
          <p className="text-slate-400 mt-3">Enter your rank and see real AI predictions instantly</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {/* Exam Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
            {Object.entries(examConfig).map(([key, val]) => (
              <button
                key={key}
                data-testid={`demo-exam-tab-${key}`}
                onClick={() => handleExamChange(key)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  exam === key
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {val.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{cfg.rankLabel} *</label>
              <input
                data-testid="demo-rank-input"
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder={cfg.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Category</label>
              <select
                data-testid="demo-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
              >
                {cfg.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                data-testid="demo-predict-btn"
                onClick={runDemo}
                disabled={loading || !rank}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {loading ? "Analyzing..." : "Predict My Colleges"}
              </button>
            </div>
          </div>

          {results && !results.error && (
            <div className="space-y-4 animate-fade-in">
              {results.ai_insight && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={14} className="text-blue-400" />
                    <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">AI Insight</span>
                  </div>
                  <p className="text-blue-200 text-sm leading-relaxed">
                    {results.ai_insight?.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').substring(0, 220)}...
                  </p>
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { key: "safe", label: "Safe", color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/10", badge: "bg-green-500/20 text-green-300" },
                  { key: "target", label: "Target", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", badge: "bg-amber-500/20 text-amber-300" },
                  { key: "dream", label: "Dream", color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-300" },
                ].map(({ key, label, color, border, bg, badge }) => (
                  <div key={key} className={`rounded-xl border ${border} ${bg} overflow-hidden`}>
                    <div className={`px-3 py-2 border-b ${border} flex items-center justify-between`}>
                      <span className={`text-xs font-bold uppercase ${color}`}>{label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge} font-medium`}>{results[key]?.length || 0}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {results[key]?.slice(0, 2).map((c, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                          <p className="text-white text-xs font-semibold leading-snug">{c.institute}</p>
                          <p className="text-slate-400 text-xs mt-0.5 truncate">{c.branch?.substring(0, 32)}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`text-xs font-bold ${color}`}>{c.probability}%</span>
                            <span className="text-slate-500 text-xs">Cutoff: {c.closing_rank?.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-slate-400 text-xs">
                {results.total} colleges found · Sign up to unlock all →{" "}
                <button onClick={() => navigate("/auth?tab=register")} className="text-blue-400 hover:underline font-medium">
                  Get Access — ₹50
                </button>
              </p>
            </div>
          )}

          {results?.error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              {results.error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Pricing({ navigate }) {
  const features = [
    "Unlimited college predictions",
    "All 3 exam modes: TS EAPCET, JEE Main & JEE Advanced",
    "Full AI counseling — unlimited messages",
    "189,000+ JoSAA records (2023–2025)",
    "52,000+ TS EAMCET records (2023–2025)",
    "Safe / Target / Dream college cards",
    "Probability score with trend analysis",
    "Personalized AI counseling strategy",
    "Email report delivery",
    "WhatsApp community access",
    "Priority support",
  ];

  return (
    <section id="pricing" className="py-24 md:py-32" data-testid="pricing-section">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-400 mb-3">Pricing</p>
        <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
          One Price. Everything Included.
        </h2>
        <p className="text-slate-400 text-lg mb-12">
          No subscriptions. No tiers. No tricks. Pay once, get everything.
        </p>

        {/* Single Premium Card */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 blur-2xl opacity-40 scale-95" />

          <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold px-5 py-2 rounded-full mb-8">
              <Sparkles size={14} />
              Full Access Plan
            </div>

            {/* Price */}
            <div className="mb-8">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-slate-400 text-2xl">₹</span>
                <span className="text-7xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>50</span>
              </div>
              <p className="text-slate-400 mt-2">One-time payment · Lifetime access</p>
            </div>

            {/* Features grid */}
            <div className="grid sm:grid-cols-2 gap-3 mb-10 text-left">
              {features.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle size={11} className="text-blue-400" />
                  </div>
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <button
                data-testid="premium-plan-btn"
                onClick={() => navigate("/auth?tab=register")}
                className="w-full py-4 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] glow-blue"
              >
                Get Full Access — ₹50
              </button>
              <p className="text-slate-500 text-sm">
                Secure payment via Razorpay · Instant unlock
              </p>
            </div>
          </div>
        </div>

        {/* Comparison hint */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" />
            Cheaper than 1 YouTube course
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" />
            Saves 10+ hours of research
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" />
            3 years of real cutoff data
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const reviews = [
    {
      name: "Ravi Teja",
      rank: "TS EAMCET Rank 4521",
      text: "Got into NIT Warangal ECE. The AI prediction was spot on — it classified it as Target and I got it in round 1!",
      img: "https://images.unsplash.com/photo-1677594332295-affd04f83115?w=60&h=60&fit=crop",
      stars: 5,
    },
    {
      name: "Priya Sharma",
      rank: "JoSAA Rank 8234",
      text: "Saved hours of research. The counselor explained categories better than any YouTube video. 100% worth ₹50.",
      img: "https://images.unsplash.com/photo-1675664534136-51375fb40129?w=60&h=60&fit=crop",
      stars: 5,
    },
    {
      name: "Kiran Reddy",
      rank: "TS EAMCET Rank 2100",
      text: "The probability scores are accurate. Got into JNTUH CSE which was predicted as 91% chance. Brilliant tool!",
      img: "https://images.unsplash.com/photo-1677594332295-affd04f83115?w=60&h=60&fit=crop",
      stars: 5,
    },
  ];

  return (
    <section className="py-24 md:py-32" data-testid="testimonials-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-yellow-400 mb-3">Testimonials</p>
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Students Who Got In
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(r.stars)].map((_, j) => (
                  <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">&ldquo;{r.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <img src={r.img} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-white text-sm font-medium">{r.name}</p>
                  <p className="text-slate-400 text-xs">{r.rank}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(null);

  const faqs = [
    {
      q: "How accurate are the predictions?",
      a: "Our predictions are based on 3 years (2023-2025) of official cutoff data from JoSAA and TS EAMCET. The AI analyzes trends to give you probability scores. Historical accuracy is above 90% for Target and Safe predictions.",
    },
    {
      q: "What is the difference between Safe, Target, and Dream?",
      a: "Safe means your rank is well within the cutoff (80%+ probability). Target means you have a realistic chance (45-80% probability). Dream means the college requires a better rank but it's still possible.",
    },
    {
      q: "What does the ₹50 payment unlock?",
      a: "₹50 unlocks unlimited predictions, full AI counseling sessions, personalized strategy report, email delivery, and WhatsApp community access. It's a one-time payment with no subscription.",
    },
    {
      q: "Which categories are supported?",
      a: "For TS EAPCET: OC, BC-A, BC-B, BC-C, BC-D, BC-E, SC, ST, EWS. For JoSAA: OPEN, OBC-NCL, EWS, SC, ST.",
    },
    {
      q: "Can I use this for both TS EAPCET and JoSAA?",
      a: "Yes! The platform supports both exams. Simply select the exam type when entering your rank.",
    },
    {
      q: "How is this different from other college predictors?",
      a: "Most predictors are simple filters. Hynexs uses AI to generate personalized counseling strategies, explain reasoning behind recommendations, and provide probability scores based on multi-year trend analysis.",
    },
  ];

  return (
    <section id="faq" className="py-24 md:py-32 bg-slate-950/30" data-testid="faq-section">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-purple-400 mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden">
              <button
                data-testid={`faq-item-${i}`}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-white font-medium text-sm pr-4">{f.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-5 animate-fade-in">
                  <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="border-t border-white/5 py-16" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/hynex-logo.jpeg"
                alt="Hynex"
                className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10"
              />
              <span className="font-bold text-xl text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                Hynexs AI Councellor
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              AI-powered college counseling for TS EAPCET and JoSAA students. Find your best college in seconds.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Twitter size={18} /></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin size={18} /></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Instagram size={18} /></a>
            </div>
          </div>

          <div>
            <p className="text-white font-medium text-sm mb-4">Platform</p>
            <ul className="space-y-2">
              {["Features", "Pricing", "How It Works", "FAQ"].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(" ", "-")}`} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-white font-medium text-sm mb-4">Contact</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Mail size={14} />
                support@hynexsedu.com
              </li>
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Phone size={14} />
                WhatsApp Community
              </li>
              <li>
                <a
                  href="https://chat.whatsapp.com/F3lEAtKrFLcJ5Fcgc3xUu5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-sm transition-colors"
                  data-testid="whatsapp-community-link"
                >
                  Join WhatsApp Group →
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2025 Hynexs AI Councellor. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#020617", color: "#F8FAFC", fontFamily: "Figtree, sans-serif" }}>
      <Navbar navigate={navigate} />
      <HeroSection navigate={navigate} />
      <TrustSection />
      <HowItWorks />
      <AIFeatures navigate={navigate} />
      <LiveDemo navigate={navigate} />
      <Pricing navigate={navigate} />
      <Testimonials />
      <FAQ />
      <Footer navigate={navigate} />
    </div>
  );
}
