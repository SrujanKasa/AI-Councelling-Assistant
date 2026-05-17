import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Brain, CheckCircle, CreditCard, Shield, Sparkles,
  TrendingUp, MessageSquare, FileText, Lock, LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FEATURES = [
  { icon: TrendingUp, label: "All college predictions (Safe / Target / Dream)" },
  { icon: Brain, label: "Full AI Counseling insights with Gemini" },
  { icon: MessageSquare, label: "Unlimited AI Counselor chat" },
  { icon: Sparkles, label: "2023–2025 cutoff trends + 2026 AI projection" },
  { icon: FileText, label: "Personalized counseling reports & email delivery" },
  { icon: Shield, label: "WhatsApp community access for live updates" },
];

export default function Upgrade() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const res = await axios.post(`${API}/payment/create-order`, {}, { headers: getAuthHeaders() });
      const { order_id, amount, currency, key_id } = res.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: "Hynexs Edu Counseller",
        description: "Premium AI Counseling Access (₹50 one-time)",
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
            await refreshUser();
            setShowSuccess(true);
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

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in" data-testid="upgrade-success-modal">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
              Welcome to Premium!
            </h3>
            <p className="text-slate-500 text-sm">
              A confirmation email has been sent to <strong>{user?.email}</strong>.
            </p>
          </div>

          <a
            href="https://chat.whatsapp.com/F3lEAtKrFLcJ5Fcgc3xUu5"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="join-whatsapp-btn"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors mb-3 text-sm"
          >
            Join WhatsApp Community
          </a>

          <button
            onClick={() => navigate("/dashboard")}
            data-testid="goto-dashboard-btn"
            className="w-full btn-primary py-3 text-sm font-semibold"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #020617 0%, #0F172A 50%, #020617 100%)" }}
      data-testid="upgrade-screen"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
              Hynexs Edu Counseller
            </p>
            <p className="text-slate-400 text-xs">Signed in as {user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="upgrade-logout-btn"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </header>

      {/* Main */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-300 text-xs font-medium mb-5">
            <Lock size={12} />
            Premium access required
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Unlock the Full Platform
            <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mt-1">
              for just ₹50
            </span>
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            One-time payment. No subscription. Get every feature, every prediction, every insight — unlimited.
          </p>
        </div>

        {/* Pricing card */}
        <div className="glass-card rounded-3xl p-8 mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-6">
            <span className="text-slate-400 text-sm line-through">₹499</span>
            <span className="text-6xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>₹50</span>
            <span className="text-slate-400 text-sm">/ lifetime</span>
          </div>

          <div className="space-y-3 mb-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-200 text-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <f.icon size={14} className="text-blue-400" />
                </div>
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm" data-testid="upgrade-error">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            data-testid="upgrade-pay-btn"
            className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            {loading ? "Processing..." : "Pay ₹50 & Unlock Now"}
          </button>

          <p className="text-center text-slate-500 text-xs mt-4">
            Secured by Razorpay • UPI, Cards, Net Banking accepted
          </p>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-xs">
            Need help? Email us at <a href="mailto:support@hynexsedu.com" className="text-blue-400 hover:underline">support@hynexsedu.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
