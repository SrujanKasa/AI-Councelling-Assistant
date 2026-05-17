import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart2, MessageSquare, Bookmark,
  FileText, Bell, LogOut, Brain, Menu, TrendingUp,
  Target, Shield, CreditCard, CheckCircle, User, Zap,
  TrendingDown, Minus, X, ChevronRight, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell, Legend
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ─── Mini 3-point sparkline (SVG) ─── */
function Sparkline({ data, trend }) {
  const valid = data?.filter(d => d.closing_rank) || [];
  if (valid.length < 2) {
    return <span className="text-slate-300 text-xs">—</span>;
  }
  const ranks = valid.map(d => d.closing_rank);
  const minR = Math.min(...ranks);
  const maxR = Math.max(...ranks);
  const range = maxR - minR || 1;
  const w = 56, h = 24, pad = 3;
  const pts = valid.map((d, i) => {
    const x = pad + (i / (valid.length - 1)) * (w - 2 * pad);
    // Higher rank = bottom (easier), lower rank = top (harder)
    const y = pad + ((maxR - d.closing_rank) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const color = trend === "easier" ? "#22c55e" : trend === "harder" ? "#f97316" : "#94a3b8";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {valid.map((d, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

/* ─── Trend Badge ─── */
function TrendBadge({ trend, changePct, small = false }) {
  const cfg = {
    easier: { bg: "bg-green-100", text: "text-green-700", icon: ArrowUpRight, label: "Easier" },
    harder: { bg: "bg-orange-100", text: "text-orange-700", icon: ArrowDownRight, label: "Tougher" },
    stable: { bg: "bg-slate-100", text: "text-slate-600", icon: Minus, label: "Stable" },
    insufficient_data: { bg: "bg-slate-100", text: "text-slate-400", icon: Minus, label: "No data" },
  }[trend] || { bg: "bg-slate-100", text: "text-slate-400", icon: Minus, label: "—" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${cfg.bg} ${cfg.text} ${small ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"}`}>
      <Icon size={10} />
      {cfg.label}
      {changePct !== 0 && trend !== "insufficient_data" && (
        <span className="opacity-75">{changePct > 0 ? `+${changePct}%` : `${changePct}%`}</span>
      )}
    </span>
  );
}

/* ─── Full Trend Modal ─── */
function TrendModal({ college, examType, category, gender, quota, onClose }) {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      exam_type: examType,
      institute: college.institute,
      branch: college.branch,
      category,
      gender,
      quota: quota || "AI",
    });
    axios.get(`${API}/predictions/trend?${params}`, { headers: getAuthHeaders() })
      .then(r => setTrendData(r.data))
      .catch(() => setTrendData({ trend: "insufficient_data", data: [] }))
      .finally(() => setLoading(false));
  }, [college, examType, category, gender, quota]);

  const examLabel = { TSEAMCET: "TS EAMCET", JEE_MAIN: "JEE Main", JEE_ADVANCED: "JEE Advanced" }[examType] || examType;

  const chartData = trendData?.data?.map(d => ({
    year: String(d.year),
    "Closing Rank": d.closing_rank || null,
    "Opening Rank": d.opening_rank || null,
  })) || [];

  const predicted = trendData?.predicted_2026
    ? [{ year: "2026 (est.)", "Closing Rank": trendData.predicted_2026, predicted: true }]
    : [];
  const fullChartData = [...chartData, ...predicted];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((p, i) => (
          p.value && <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value?.toLocaleString()}
          </p>
        ))}
        {label === "2026 (est.)" && (
          <p className="text-slate-400 mt-1 italic">AI projection</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-lg leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>
                {college.institute}
              </h2>
              <p className="text-slate-500 text-sm mt-0.5 truncate">{college.branch}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">{examLabel}</span>
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{category}</span>
                {!loading && trendData && (
                  <TrendBadge trend={trendData.trend} changePct={trendData.change_pct} />
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Trend summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[2023, 2024, 2025].map(yr => {
                  const d = trendData?.data?.find(x => x.year === yr);
                  const rank = d?.closing_rank;
                  const prev = trendData?.data?.find(x => x.year === yr - 1)?.closing_rank;
                  const delta = rank && prev ? rank - prev : null;
                  return (
                    <div key={yr} className={`rounded-xl border p-4 text-center ${rank ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50"}`}>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">{yr}</p>
                      {rank ? (
                        <>
                          <p className="text-2xl font-black text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {rank.toLocaleString()}
                          </p>
                          {delta !== null && (
                            <p className={`text-xs font-semibold mt-1 ${delta > 0 ? "text-green-600" : delta < 0 ? "text-orange-600" : "text-slate-400"}`}>
                              {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} vs {yr - 1}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-400 text-sm mt-1">No data</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chart */}
              {fullChartData.some(d => d["Closing Rank"]) ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-slate-700 text-sm">Cutoff Rank Trend (2023–2025)</p>
                    <p className="text-slate-400 text-xs">↑ Higher rank = Easier to get in</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={fullChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => v?.toLocaleString()}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Closing Rank" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {fullChartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.predicted ? "#c7d2fe" : trendData?.trend === "easier" ? "#86efac" : trendData?.trend === "harder" ? "#fdba74" : "#93c5fd"}
                            />
                          ))}
                        </Bar>
                        <Line
                          type="monotone"
                          dataKey="Closing Rank"
                          stroke={trendData?.trend === "easier" ? "#16a34a" : trendData?.trend === "harder" ? "#ea580c" : "#3b82f6"}
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Not enough data to show trend chart</p>
                </div>
              )}

              {/* 2026 prediction */}
              {trendData?.predicted_2026 && (
                <div className={`rounded-xl p-4 border ${trendData.trend === "easier" ? "bg-green-50 border-green-200" : trendData.trend === "harder" ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800">2026 Projected Cutoff</p>
                      <p className="text-slate-500 text-xs mt-0.5">Based on linear trend from {trendData.years_with_data}-year data</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                        ~{trendData.predicted_2026?.toLocaleString()}
                      </p>
                      <TrendBadge trend={trendData.trend} changePct={trendData.change_pct} small />
                    </div>
                  </div>
                </div>
              )}

              {/* Interpretation */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How to Read This</p>
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-600 flex items-start gap-2">
                    <ArrowUpRight size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Rising rank</strong> = more students qualify → college is getting <strong>easier</strong> to get into</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-start gap-2">
                    <ArrowDownRight size={12} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Falling rank</strong> = fewer students qualify → college is getting <strong>tougher</strong> (more competition)</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "predictions", label: "Predictions", icon: BarChart2 },
  { id: "counselor", label: "AI Counselor", icon: MessageSquare, route: "/counselor" },
  { id: "saved", label: "Saved Colleges", icon: Bookmark },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "updates", label: "Counseling Updates", icon: Bell },
];

function Sidebar({ active, setActive, navigate, logout, user, open, setOpen }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        data-testid="dashboard-sidebar"
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-white/5 z-30 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <img
              src="/hynex-logo.jpeg"
              alt="Hynex"
              className="w-8 h-8 rounded-lg object-cover"
              data-testid="sidebar-logo"
            />
            <span className="font-bold text-white text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
              Hynexs AI
            </span>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || "Student"}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          {user?.is_premium && (
            <div className="mt-2 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1">
              <CheckCircle size={12} className="text-blue-400" />
              <span className="text-blue-300 text-xs font-medium">Premium</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              data-testid={`sidebar-${item.id}`}
              onClick={() => {
                if (item.route) {
                  navigate(item.route);
                } else {
                  setActive(item.id);
                }
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                active === item.id
                  ? "sidebar-active font-medium"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/5">
          <button
            data-testid="sidebar-logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function PredictionForm({ user, onResults }) {
  const [form, setForm] = useState({
    exam_type: "TSEAMCET",
    rank: user?.rank || "",
    category: user?.category || "OC",
    gender: "Male",
    quota: "AI",
    branches: [],
    college_types: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    axios.get(`${API}/predictions/branches`)
      .then(r => setBranchOptions(r.data.branches || []))
      .catch(() => setBranchOptions([]));
  }, []);

  const CTYPE_OPTIONS = ["NIT", "IIIT", "GFTI", "Other"];

  const toggleBranch = (b) => {
    setForm(f => ({
      ...f,
      branches: f.branches.includes(b)
        ? f.branches.filter(x => x !== b)
        : [...f.branches, b],
    }));
  };

  const toggleCType = (t) => {
    setForm(f => ({
      ...f,
      college_types: f.college_types.includes(t)
        ? f.college_types.filter(x => x !== t)
        : [...f.college_types, t],
    }));
  };

  const examConfig = {
    TSEAMCET: {
      label: "TS EAPCET",
      rankLabel: "TS EAMCET Rank (CRL)",
      rankPlaceholder: "e.g. 5000",
      rankHelp: "Your common rank in TS EAMCET",
      categories: ["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST", "EWS"],
      quota: null,
      example: "e.g. 5,000",
    },
    JEE_MAIN: {
      label: "JEE Main (NITs/IIITs)",
      rankLabel: "JEE Main CRL Rank",
      rankPlaceholder: "e.g. 50000",
      rankHelp: "Common Rank List (CRL) from JEE Main",
      categories: ["OPEN", "OBC-NCL", "EWS", "SC", "ST"],
      quota: true,
      example: "e.g. 50,000",
    },
    JEE_ADVANCED: {
      label: "JEE Advanced (IITs)",
      rankLabel: "JEE Advanced CRL Rank",
      rankPlaceholder: "e.g. 5000",
      rankHelp: "Common Rank List (CRL) from JEE Advanced",
      categories: ["OPEN", "OBC-NCL", "EWS", "SC", "ST"],
      quota: true,
      example: "e.g. 5,000",
    },
  };

  const cfg = examConfig[form.exam_type];

  const handleExamChange = (exam) => {
    const newCfg = examConfig[exam];
    setForm({
      ...form,
      exam_type: exam,
      rank: "",
      category: newCfg.categories[0],
      quota: "AI",
      branches: [],
      college_types: [],
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        rank: parseInt(form.rank),
        branches: form.branches.length ? form.branches : null,
        college_types: form.college_types.length ? form.college_types : null,
      };
      const res = await axios.post(
        `${API}/predictions/predict`,
        payload,
        { headers: getAuthHeaders() }
      );
      onResults(res.data, form);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to get predictions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Target size={18} className="text-blue-500" />
        <h3 className="font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
          Get College Predictions
        </h3>
      </div>

      {/* Exam type selector */}
      <div className="flex flex-wrap gap-2 mb-5 p-1 bg-slate-50 rounded-xl border border-slate-200">
        {Object.entries(examConfig).map(([key, val]) => (
          <button
            key={key}
            data-testid={`exam-tab-${key}`}
            onClick={() => handleExamChange(key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              form.exam_type === key
                ? "bg-white shadow-sm text-blue-600 border border-blue-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Rank info banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">i</span>
        </div>
        <p className="text-blue-700 text-xs leading-relaxed">
          <strong>{cfg.rankLabel}:</strong> {cfg.rankHelp}.
          {form.exam_type === "JEE_ADVANCED" && " IITs only accept JEE Advanced CRL rank — not JEE Main rank."}
          {form.exam_type === "JEE_MAIN" && " NITs, IIITs and GFTIs use JEE Main CRL rank (not state rank)."}
          {form.exam_type === "TSEAMCET" && " Telangana Engineering college cutoffs use TS EAMCET rank."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-slate-500 text-xs mb-1 block font-medium">{cfg.rankLabel} *</label>
          <input
            data-testid="pred-rank-input"
            type="number"
            required
            min={1}
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value })}
            placeholder={cfg.rankPlaceholder}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="text-slate-500 text-xs mb-1 block font-medium">Category *</label>
          <select
            data-testid="pred-category-select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {cfg.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-slate-500 text-xs mb-1 block font-medium">Gender *</label>
          <select
            data-testid="pred-gender-select"
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {cfg.quota && (
          <div>
            <label className="text-slate-500 text-xs mb-1 block font-medium">Quota</label>
            <select
              data-testid="pred-quota-select"
              value={form.quota}
              onChange={(e) => setForm({ ...form, quota: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="AI">All India (AI)</option>
              <option value="HS">Home State (HS)</option>
              <option value="OS">Outside State (OS)</option>
            </select>
          </div>
        )}

        <div className={cfg.quota ? "" : "md:col-start-4"}>
          <button
            data-testid="pred-submit-btn"
            type="submit"
            disabled={loading || !form.rank}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 h-9 text-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {loading ? "Analyzing..." : "Predict"}
          </button>
        </div>
      </form>

      {/* Advanced filters toggle */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <button
          type="button"
          data-testid="toggle-advanced-filters"
          onClick={() => setShowAdvanced(s => !s)}
          className="text-blue-600 text-xs font-semibold hover:text-blue-700 flex items-center gap-1"
        >
          {showAdvanced ? "Hide" : "Show"} advanced filters
          <ChevronRight size={12} className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 animate-fade-in" data-testid="advanced-filters">
            {/* Branches */}
            <div>
              <label className="text-slate-700 text-xs font-bold mb-2 block">
                Preferred Branches
                <span className="ml-2 font-normal text-slate-400">
                  {form.branches.length ? `${form.branches.length} selected` : "all branches"}
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {branchOptions.map(b => {
                  const active = form.branches.includes(b);
                  return (
                    <button
                      type="button"
                      key={b}
                      data-testid={`branch-chip-${b}`}
                      onClick={() => toggleBranch(b)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        active
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* College Type (only for JEE Main) */}
            {form.exam_type === "JEE_MAIN" && (
              <div>
                <label className="text-slate-700 text-xs font-bold mb-2 block">
                  College Type
                  <span className="ml-2 font-normal text-slate-400">
                    {form.college_types.length ? `${form.college_types.length} selected` : "all types"}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CTYPE_OPTIONS.map(t => {
                    const active = form.college_types.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        data-testid={`ctype-chip-${t}`}
                        onClick={() => toggleCType(t)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                          active
                            ? "bg-purple-500 text-white border-purple-500"
                            : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

function CollegeCard({ row, index, typeConfig, onClick }) {
  const cfg = typeConfig[row.category] || typeConfig.Dream;

  return (
    <div
      data-testid={`college-card-${index}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className={`group relative rounded-2xl border-2 p-5 bg-white hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${cfg.border}`}
    >
      {/* Top row: chance badge + probability */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.badge}`}>
          {row.category}
        </span>
        <div className="text-right">
          <span className={`text-2xl font-black ${cfg.color}`} style={{ fontFamily: "Outfit, sans-serif" }}>
            {row.probability}%
          </span>
          <p className="text-slate-400 text-xs leading-none">chance</p>
        </div>
      </div>

      {/* College name */}
      <h4 className="text-slate-900 font-bold text-sm leading-snug mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
        {row.institute}
      </h4>

      {/* Branch */}
      <p className="text-slate-500 text-xs mb-3 leading-relaxed">{row.branch}</p>

      {/* Probability bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${cfg.barColor}`}
          style={{ width: `${row.probability}%` }}
        />
      </div>

      {/* Bottom metadata */}
      <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
          Cutoff: <strong className="text-slate-600 ml-0.5">{row.closing_rank?.toLocaleString()}</strong>
        </span>
        {row.college_type && row.college_type !== "Other" && (
          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
            {row.college_type}
          </span>
        )}
        {row.nirf && row.nirf < 200 && (
          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            NIRF #{row.nirf}
          </span>
        )}
        <span className="text-slate-400">{row.year}</span>
      </div>

      {row.fees && row.fees !== "N/A" && (
        <p className="text-xs text-slate-400 mt-1.5 truncate">{row.fees}</p>
      )}

      {/* Why this college? */}
      {row.explanation && (
        <p className="mt-3 text-xs text-slate-500 leading-relaxed border-l-2 border-slate-200 pl-2 italic">
          {row.explanation}
        </p>
      )}

      {/* View Trend CTA */}
      <div
        data-testid={`view-trend-${index}`}
        className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs"
      >
        <span className="flex items-center gap-1.5 text-slate-500 group-hover:text-blue-600 transition-colors font-medium">
          <TrendingUp size={12} />
          View 2023–2025 Trend
        </span>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

// Premium gating now handled at route-level (/upgrade redirect). All users
// reaching this component already have full access.

const TIER_CONFIG = {
  "Very Safe": {
    color: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    barColor: "bg-emerald-500",
    sectionBg: "bg-gradient-to-r from-emerald-50 to-green-50",
    sectionBorder: "border-emerald-200",
    sectionTitle: "text-emerald-700",
    icon: "✓✓",
    description: "Admission near-certain based on cutoff history",
  },
  "Safe": {
    color: "text-green-600",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700",
    barColor: "bg-green-500",
    sectionBg: "bg-gradient-to-r from-green-50 to-lime-50",
    sectionBorder: "border-green-200",
    sectionTitle: "text-green-700",
    icon: "✓",
    description: "High probability — comfortable margin under cutoff",
  },
  "Moderate": {
    color: "text-amber-600",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    barColor: "bg-amber-500",
    sectionBg: "bg-gradient-to-r from-amber-50 to-yellow-50",
    sectionBorder: "border-amber-200",
    sectionTitle: "text-amber-700",
    icon: "◎",
    description: "Realistic — your rank is near the cutoff range",
  },
  "Competitive": {
    color: "text-orange-600",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    barColor: "bg-orange-500",
    sectionBg: "bg-gradient-to-r from-orange-50 to-amber-50",
    sectionBorder: "border-orange-200",
    sectionTitle: "text-orange-700",
    icon: "▲",
    description: "Stretch — depends on cutoff dip in your favour",
  },
  "Difficult": {
    color: "text-rose-600",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    barColor: "bg-rose-500",
    sectionBg: "bg-gradient-to-r from-rose-50 to-red-50",
    sectionBorder: "border-rose-200",
    sectionTitle: "text-rose-700",
    icon: "✦",
    description: "Long-shot — only if cutoffs rise significantly",
  },
};

const TIER_ORDER = ["Very Safe", "Safe", "Moderate", "Competitive", "Difficult"];
const PAGE_SIZE = 12;

function TierSection({ tier, colleges, onCardClick }) {
  const cfg = TIER_CONFIG[tier];
  const [visible, setVisible] = useState(PAGE_SIZE);
  if (!colleges || colleges.length === 0) return null;

  const shown = colleges.slice(0, visible);
  const remaining = colleges.length - visible;

  return (
    <div data-testid={`tier-section-${tier.replace(/\s/g, "-")}`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-t-xl border-t border-x ${cfg.sectionBorder} ${cfg.sectionBg}`}>
        <span className={`text-xl ${cfg.color} font-bold`}>{cfg.icon}</span>
        <div className="min-w-0">
          <h3 className={`font-bold text-sm ${cfg.sectionTitle}`} style={{ fontFamily: "Outfit, sans-serif" }}>
            {tier}
          </h3>
          <p className="text-slate-500 text-xs hidden sm:block">{cfg.description}</p>
        </div>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {colleges.length} colleges
        </span>
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 rounded-b-xl border ${cfg.sectionBorder} bg-white/60`}>
        {shown.map((row, i) => (
          <CollegeCard
            key={`${row.institute}|${row.branch}|${i}`}
            row={row}
            index={`${tier}-${i}`}
            typeConfig={TIER_CONFIG}
            onClick={() => onCardClick(row)}
          />
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center mt-3">
          <button
            data-testid={`show-more-${tier.replace(/\s/g, "-")}`}
            onClick={() => setVisible(v => v + PAGE_SIZE)}
            className="text-blue-600 hover:text-blue-700 text-sm font-semibold bg-white border border-blue-200 hover:border-blue-400 rounded-full px-5 py-2 transition-colors flex items-center gap-1.5"
          >
            Show {Math.min(remaining, PAGE_SIZE)} more
            <ChevronRight size={14} className="-mr-1" />
            <span className="text-slate-400 text-xs">({remaining} hidden)</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PredictionResults({ results, examType, predForm }) {
  const [selectedCollege, setSelectedCollege] = useState(null);
  if (!results) return null;

  const examLabel = {
    TSEAMCET: "TS EAMCET",
    JEE_MAIN: "JEE Main (NITs/IIITs/GFTIs)",
    JEE_ADVANCED: "JEE Advanced (IITs)",
  }[examType] || examType;

  // Use 5-tier groups from new API; gracefully fall back to legacy fields
  const groups = results.groups || {};
  const counts = results.counts || {};

  return (
    <div className="space-y-6" data-testid="prediction-results">
      {/* AI Insight */}
      {results.ai_insight && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <p className="text-blue-800 font-bold text-sm">AI Counseling Insight</p>
              <p className="text-blue-400 text-xs">{examLabel}</p>
            </div>
            <span className="ml-auto bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
              Gemini AI
            </span>
          </div>
          <div className="text-blue-900 text-sm leading-relaxed" data-testid="ai-insight-text">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-blue-950">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-blue-800">{children}</ul>,
                li: ({ children }) => <li>{children}</li>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-blue-800">{children}</ol>,
                h3: ({ children }) => <h3 className="font-bold text-blue-950 mb-1 mt-2">{children}</h3>,
              }}
            >
              {results.ai_insight}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-4">
        <span className="text-slate-700 text-sm font-bold mr-2">{examLabel}</span>
        {TIER_ORDER.map((tier) => {
          const c = counts[tier] || 0;
          if (c === 0) return null;
          const cfg = TIER_CONFIG[tier];
          return (
            <span key={tier} className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.badge}`}>
              {tier}: {c}
            </span>
          );
        })}
        <span className="ml-auto text-slate-500 text-xs font-medium">
          {results.total} colleges found
        </span>
      </div>

      {/* No results state */}
      {results.total === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center" data-testid="no-results">
          <p className="text-slate-500 font-medium">No colleges match your filters</p>
          <p className="text-slate-400 text-sm mt-1">Try removing branch or college-type filters to see more results.</p>
        </div>
      )}

      {/* Tier sections (5-tier) */}
      {TIER_ORDER.map((tier) => (
        <TierSection
          key={tier}
          tier={tier}
          colleges={groups[tier] || []}
          onCardClick={setSelectedCollege}
        />
      ))}

      {/* Trend Modal */}
      {selectedCollege && (
        <TrendModal
          college={selectedCollege}
          examType={examType}
          category={predForm?.category}
          gender={predForm?.gender}
          quota={predForm?.quota}
          onClose={() => setSelectedCollege(null)}
        />
      )}
    </div>
  );
}

function PaymentModal({ onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      // Load Razorpay script
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      // Create order
      const res = await axios.post(
        `${API}/payment/create-order`,
        {},
        { headers: getAuthHeaders() }
      );
      const { order_id, amount, currency, key_id } = res.data;

      const options = {
        key: key_id || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "Hynexs AI Councellor",
        description: "Premium AI Counseling Access",
        order_id,
        handler: async (response) => {
          try {
            await axios.post(
              `${API}/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: getAuthHeaders() }
            );
            onSuccess();
          } catch (e) {
            setError("Payment verification failed. Contact support.");
          }
        },
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#3B82F6" },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to initiate payment");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            Unlock Premium Access
          </h3>
          <p className="text-slate-500 text-sm">One-time payment. No subscription.</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600 text-sm">Premium Access</span>
            <span className="font-bold text-slate-800">₹50</span>
          </div>
          {[
            "Unlimited predictions",
            "Full AI counseling sessions",
            "All colleges unlocked",
            "Personalized strategy",
            "Email report delivery",
            "WhatsApp community",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-600 py-1">
              <CheckCircle size={14} className="text-green-500" />
              {f}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="pay-now-btn"
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Pay ₹50 Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [predForm, setPredForm] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [savedColleges, setSavedColleges] = useState([]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    await refreshUser();
    setShowPaymentSuccess(true);
  };

  const overview = (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
          Welcome back, {user?.name?.split(" ")[0]}!
        </h2>
        <p className="text-blue-100 text-sm">
          {user?.is_premium
            ? "Premium access active. All features unlocked."
            : "Get full access for ₹50 — one-time payment, no subscription."}
        </p>
        {!user?.is_premium && (
          <button
            data-testid="upgrade-banner-btn"
            onClick={() => setShowPayment(true)}
            className="mt-3 bg-white text-blue-600 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Pay ₹50 — Get Full Access
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Your Rank", value: user?.rank || "Not set", icon: TrendingUp, color: "text-blue-500" },
          { label: "Premium Status", value: user?.is_premium ? "Active" : "₹50", icon: Shield, color: "text-purple-500" },
          { label: "Predictions", value: predictions ? (predictions.total || 0) : "—", icon: Target, color: "text-green-500" },
          { label: "Exam Type", value: user?.exam_type || "Not set", icon: BarChart2, color: "text-orange-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <stat.icon size={18} className={`${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
              {stat.value}
            </p>
            <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <PredictionForm user={user} onResults={(r, f) => { setPredictions(r); setPredForm(f); setActive("predictions"); }} />
    </div>
  );

  const predictionsView = (
    <div className="space-y-4 animate-fade-in">
      <PredictionForm user={user} onResults={(r, f) => { setPredictions(r); setPredForm(f); }} />
      {predictions && (
        <PredictionResults
          results={predictions}
          examType={predForm?.exam_type}
          predForm={predForm}
        />
      )}
      {!predictions && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BarChart2 size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Enter your rank above to see college predictions</p>
        </div>
      )}
    </div>
  );

  const savedView = (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Bookmark size={40} className="text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">No saved colleges yet</p>
      <p className="text-slate-400 text-sm mt-1">Run predictions and save colleges you like</p>
    </div>
  );

  const reportsView = (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <FileText size={40} className="text-slate-300 mx-auto mb-3" />
      {user?.is_premium ? (
        <>
          <p className="text-slate-500 font-medium">No reports generated yet</p>
          <p className="text-slate-400 text-sm mt-1">Run predictions to auto-generate your counseling report</p>
        </>
      ) : (
        <>
          <p className="text-slate-500 font-medium">Premium feature</p>
          <p className="text-slate-400 text-sm mt-1">Upgrade to get personalized PDF reports</p>
          <button onClick={() => setShowPayment(true)} className="btn-primary mt-4 text-sm">
            Unlock Reports — ₹50
          </button>
        </>
      )}
    </div>
  );

  const updatesView = (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
        Counseling Updates
      </h3>
      <div className="space-y-3">
        {[
          { title: "JoSAA Round 1 Results", date: "Expected June 2025", status: "upcoming" },
          { title: "TS EAPCET Phase 1 Web Options", date: "July 2025", status: "upcoming" },
          { title: "Join WhatsApp Community", date: "Get real-time updates", status: "active", link: "https://chat.whatsapp.com/F3lEAtKrFLcJ5Fcgc3xUu5" },
        ].map((update, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div>
              <p className="text-slate-700 text-sm font-medium">{update.title}</p>
              <p className="text-slate-400 text-xs">{update.date}</p>
            </div>
            {update.link ? (
              <a
                href={update.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 text-xs hover:underline"
              >
                Join
              </a>
            ) : (
              <span className={`text-xs px-2 py-1 rounded-full ${update.status === "active" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                {update.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const views = {
    overview,
    predictions: predictionsView,
    saved: savedView,
    reports: reportsView,
    updates: updatesView,
  };

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Sidebar
        active={active}
        setActive={setActive}
        navigate={navigate}
        logout={handleLogout}
        user={user}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      {/* Main */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-slate-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                {SIDEBAR_ITEMS.find((s) => s.id === active)?.label || "Dashboard"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!user?.is_premium && (
              <button
                data-testid="header-upgrade-btn"
                onClick={() => setShowPayment(true)}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Upgrade ₹50
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6" data-testid="dashboard-main">
          {views[active] || overview}
        </main>
      </div>

      {showPayment && (
        <PaymentModal
          user={user}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in" data-testid="payment-success-modal">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome to Premium!
              </h3>
              <p className="text-slate-500 text-sm">
                Your ₹50 access is now active. A confirmation email has been sent to <strong>{user?.email}</strong>.
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-bold text-green-800 mb-2">What's unlocked:</p>
              <div className="space-y-1">
                {[
                  "All college predictions (Safe / Target / Dream)",
                  "Full AI Counseling sessions",
                  "2023–2025 cutoff trends + 2026 projections",
                  "Personalized counseling reports",
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <a
              href="https://chat.whatsapp.com/F3lEAtKrFLcJ5Fcgc3xUu5"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="join-whatsapp-btn"
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors mb-3 text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
              </svg>
              Join WhatsApp Community
            </a>

            <button
              onClick={() => setShowPaymentSuccess(false)}
              data-testid="success-continue-btn"
              className="w-full py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
