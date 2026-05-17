import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart2, MessageSquare, Bookmark,
  FileText, Bell, LogOut, Brain, Menu, X, TrendingUp,
  Target, Shield, CreditCard, CheckCircle, User, Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
              Hynexs Edu
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
  });
  const [loading, setLoading] = useState(false);

  const tsCategories = ["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST", "EWS"];
  const josaaCategories = ["OPEN", "OBC-NCL", "EWS", "SC", "ST"];
  const categories = form.exam_type === "TSEAMCET" ? tsCategories : josaaCategories;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/predictions/predict`,
        { ...form, rank: parseInt(form.rank) },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      onResults(res.data, form);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Target size={18} className="text-blue-500" />
        <h3 className="font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
          Get College Predictions
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Exam Type</label>
          <select
            data-testid="pred-exam-select"
            value={form.exam_type}
            onChange={(e) => setForm({ ...form, exam_type: e.target.value, category: "" })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="TSEAMCET">TS EAPCET</option>
            <option value="JOSAA">JoSAA</option>
          </select>
        </div>

        <div>
          <label className="text-slate-500 text-xs mb-1 block">Your Rank</label>
          <input
            data-testid="pred-rank-input"
            type="number"
            required
            min={1}
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value })}
            placeholder="e.g. 5000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-slate-500 text-xs mb-1 block">Category</label>
          <select
            data-testid="pred-category-select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-slate-500 text-xs mb-1 block">Gender</label>
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

        <button
          data-testid="pred-submit-btn"
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 h-9 text-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Zap size={14} />
          )}
          {loading ? "Analyzing..." : "Predict"}
        </button>
      </form>
    </div>
  );
}

function PredictionResults({ results, user, onPayment }) {
  if (!results) return null;

  const typeConfig = {
    Safe: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
    Target: { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
    Dream: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
  };

  const allResults = [...(results.safe || []), ...(results.target || []), ...(results.dream || [])];
  const limited = !user?.is_premium;
  const displayed = limited ? allResults.slice(0, 5) : allResults;

  return (
    <div className="space-y-4">
      {/* AI Insight */}
      {results.ai_insight && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-blue-500" />
            <p className="text-blue-700 font-semibold text-sm">AI Counseling Insight</p>
          </div>
          <p className="text-blue-700 text-sm leading-relaxed" data-testid="ai-insight-text">
            {results.ai_insight}
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {["safe", "target", "dream"].map((t) => (
          <div key={t} className={`rounded-xl border p-4 ${typeConfig[t.charAt(0).toUpperCase() + t.slice(1)]?.bg} ${typeConfig[t.charAt(0).toUpperCase() + t.slice(1)]?.border}`}>
            <p className={`text-xs font-bold uppercase ${typeConfig[t.charAt(0).toUpperCase() + t.slice(1)]?.color}`}>
              {t}
            </p>
            <p className={`text-2xl font-bold mt-1 ${typeConfig[t.charAt(0).toUpperCase() + t.slice(1)]?.color}`} style={{ fontFamily: "Outfit, sans-serif" }}>
              {results[t]?.length || 0}
            </p>
            <p className="text-slate-500 text-xs">colleges</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
            College Predictions ({results.total} found)
          </h4>
          {limited && (
            <span className="text-xs text-slate-400">Showing 5 of {results.total}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="predictions-table">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">College</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Branch</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Type</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Probability</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Cutoff Rank</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, i) => {
                const cfg = typeConfig[row.category] || typeConfig.Dream;
                return (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-xs">
                      <p className="truncate">{row.institute}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <p className="truncate text-xs">{row.branch}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${row.category === "Safe" ? "bg-green-500" : row.category === "Target" ? "bg-yellow-500" : "bg-orange-500"}`}
                            style={{ width: `${row.probability}%` }}
                          />
                        </div>
                        <span className={`font-bold text-xs ${cfg.color}`}>{row.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.closing_rank}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paywall */}
        {limited && results.total > 5 && (
          <div className="border-t border-slate-200 p-6 text-center bg-gradient-to-b from-white to-slate-50">
            <div className="mb-3">
              <Shield size={24} className="text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                {results.total - 5} more colleges hidden
              </p>
              <p className="text-slate-500 text-sm">Upgrade for ₹50 to unlock all predictions, AI counseling, and reports</p>
            </div>
            <button
              data-testid="unlock-premium-btn"
              onClick={onPayment}
              className="btn-primary"
            >
              Unlock Premium — ₹50
            </button>
          </div>
        )}
      </div>
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
        { headers: getAuthHeaders(), withCredentials: true }
      );
      const { order_id, amount, currency, key_id } = res.data;

      const options = {
        key: key_id || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "Hynexs Edu Counseller",
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
              { headers: getAuthHeaders(), withCredentials: true }
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
  const [savedColleges, setSavedColleges] = useState([]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    await refreshUser();
    alert("Premium access unlocked! Welcome to Hynexs Premium.");
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
            : "Free plan. Upgrade for full access."}
        </p>
        {!user?.is_premium && (
          <button
            data-testid="upgrade-banner-btn"
            onClick={() => setShowPayment(true)}
            className="mt-3 bg-white text-blue-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Upgrade to Premium — ₹50
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Your Rank", value: user?.rank || "Not set", icon: TrendingUp, color: "text-blue-500" },
          { label: "Premium Status", value: user?.is_premium ? "Active" : "Free", icon: Shield, color: "text-purple-500" },
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
          user={user}
          onPayment={() => setShowPayment(true)}
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
    </div>
  );
}
