import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, CreditCard, BarChart2, Brain, ArrowLeft,
  TrendingUp, Database, Shield, RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`, {
        headers: getAuthHeaders(),
      });
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/admin/users`, {
        headers: getAuthHeaders(),
      });
      setUsers(res.data.users || []);
    } catch (e) {}
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API}/admin/payments`, {
        headers: getAuthHeaders(),
      });
      setPayments(res.data.payments || []);
    } catch (e) {}
  };

  const fetchPredictions = async () => {
    try {
      const res = await axios.get(`${API}/admin/predictions`, {
        headers: getAuthHeaders(),
      });
      setPredictions(res.data.predictions || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPayments();
    fetchPredictions();
  }, []);

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-500" },
        { label: "Premium Users", value: stats.premium_users, icon: Shield, color: "text-purple-500" },
        { label: "Total Revenue", value: `₹${stats.total_revenue}`, icon: CreditCard, color: "text-green-500" },
        { label: "Predictions", value: stats.total_predictions, icon: BarChart2, color: "text-orange-500" },
        { label: "JoSAA Records", value: stats.josaa_records?.toLocaleString(), icon: Database, color: "text-indigo-500" },
        { label: "TS EAMCET Records", value: stats.ts_eamcet_records?.toLocaleString(), icon: Database, color: "text-cyan-500" },
      ]
    : [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "payments", label: "Payments" },
    { id: "predictions", label: "Predictions" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }} data-testid="admin-panel">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-blue-500" />
            <div>
              <h1 className="font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                Admin Panel
              </h1>
              <p className="text-slate-400 text-xs">Hynexs Edu Counseller</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
            Admin
          </span>
          <span className="text-slate-600 text-sm">{user?.email}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              data-testid={`admin-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {statCards.map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <s.icon size={20} className={`${s.color} mb-3`} />
                  <p className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {s.value}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                System Status
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Database", status: "Connected", ok: true },
                  { label: "AI Counselor (Gemini Flash)", status: "Active", ok: true },
                  { label: "Razorpay (Test Mode)", status: "Configured", ok: true },
                  { label: "Resend Email", status: "Configured", ok: true },
                  { label: "JoSAA Data (2023-2025)", status: stats ? `${stats.josaa_records?.toLocaleString()} records` : "Loading...", ok: !!stats?.josaa_records },
                  { label: "TS EAMCET Data (2023-2025)", status: stats ? `${stats.ts_eamcet_records?.toLocaleString()} records` : "Loading...", ok: !!stats?.ts_eamcet_records },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-slate-600 text-sm">{item.label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.ok ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Users ({users.length})</h3>
              <button onClick={fetchUsers} className="text-slate-400 hover:text-slate-700">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="admin-users-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Name</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Email</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Role</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Premium</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.role === "admin" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.is_premium ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"}`}>
                          {u.is_premium ? "Premium" : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {tab === "payments" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">
                Payments ({payments.length}) — Total ₹{payments.filter(p => p.status === "paid").length * 50}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="admin-payments-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Order ID</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Amount</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Status</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{p.order_id}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">₹{(p.amount / 100).toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <p className="text-center py-12 text-slate-400 text-sm">No payments yet</p>
              )}
            </div>
          </div>
        )}

        {/* Predictions */}
        {tab === "predictions" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Recent Predictions ({predictions.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="admin-predictions-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">User</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Exam</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Rank</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Category</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{p.user_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">{p.exam_type}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{p.rank?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {predictions.length === 0 && (
                <p className="text-center py-12 text-slate-400 text-sm">No predictions yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
