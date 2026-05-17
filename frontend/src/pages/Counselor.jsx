import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Send, LayoutDashboard, ArrowLeft, Sparkles, User, Bot,
  MessageSquare, Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const STARTER_PROMPTS = [
  "What are the safe colleges for CSE with rank 5000 in TS EAMCET?",
  "Explain the difference between OBC-NCL and EWS category in JoSAA",
  "What is the counseling strategy for rank 12000 in JOSAA?",
  "Which NIT has best placements for ECE branch?",
  "How does round-wise seat allotment work in JoSAA?",
  "What branches should I prefer if my rank is 3000 OC category?",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} mb-4`}>
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-purple-500"
            : "bg-gradient-to-br from-slate-700 to-slate-800"
        }`}
      >
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-none"
            : "bg-white/10 border border-white/10 text-slate-200 rounded-tl-none"
        }`}
      >
        {isUser ? (
          msg.content.split("\n").map((line, i) => (
            <p key={i} className={line === "" ? "h-2" : ""}>{line}</p>
          ))
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-slate-200">{children}</li>,
              h3: ({ children }) => <h3 className="font-bold text-white mb-1 mt-2">{children}</h3>,
              h4: ({ children }) => <h4 className="font-semibold text-white mb-1">{children}</h4>,
              code: ({ children }) => <code className="bg-white/10 px-1 rounded text-xs font-mono">{children}</code>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function Counselor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [exam, setExam] = useState("TSEAMCET");
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("OC");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");

    const userMsg = { role: "user", content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/counselor/chat`,
        {
          message: msg,
          session_id: sessionId,
          exam_type: exam,
          rank: rank ? parseInt(rank) : undefined,
          category: category || undefined,
        },
        { headers: getAuthHeaders() }
      );

      if (!sessionId) setSessionId(res.data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.response, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to get response. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err.response?.status === 402
              ? "You've reached the free message limit. Please upgrade to Premium (₹50) for unlimited AI counseling."
              : detail,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #020617 0%, #0F172A 100%)" }}
      data-testid="counselor-page"
    >
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white transition-colors"
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                Hynexs AI Counselor
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-green-400 text-xs">Online</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
      </header>

      {/* Context bar */}
      <div className="border-b border-white/5 px-6 py-3 flex flex-wrap gap-3 bg-slate-950/30">
        <select
          data-testid="counselor-exam-select"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
        >
          <option value="TSEAMCET">TS EAPCET</option>
          <option value="JOSAA">JoSAA</option>
        </select>
        <input
          data-testid="counselor-rank-input"
          type="number"
          placeholder="Your rank..."
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none placeholder-slate-500"
        />
        <select
          data-testid="counselor-category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
        >
          <option value="OC">OC</option>
          <option value="BC_A">BC-A</option>
          <option value="BC_B">BC-B</option>
          <option value="SC">SC</option>
          <option value="ST">ST</option>
          <option value="OPEN">OPEN</option>
          <option value="OBC-NCL">OBC-NCL</option>
          <option value="EWS">EWS</option>
        </select>
        <button
          onClick={() => { setMessages([]); setSessionId(null); }}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
          data-testid="new-chat-btn"
        >
          <Plus size={12} />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-6">
              <Brain size={28} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-medium text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
              Ask Hynexs AI Counselor
            </h2>
            <p className="text-slate-400 text-sm mb-8 max-w-md">
              Get personalized college counseling based on your rank, category, and preferences.
              Ask about any college, branch, or counseling strategy.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="glass-card rounded-xl p-4 text-left text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                  data-testid={`starter-prompt-${i}`}
                >
                  <Sparkles size={12} className="text-blue-400 mb-2" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-4 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <textarea
              data-testid="counselor-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about colleges, branches, categories, strategy..."
              rows={1}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          <button
            data-testid="counselor-send-btn"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn-primary px-4 py-3 flex items-center justify-center disabled:opacity-50 rounded-xl"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-slate-600 text-xs mt-2">
          AI counselor powered by Gemini Flash. May occasionally give imprecise information.
        </p>
      </div>
    </div>
  );
}
