import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Bot, LayoutList, FileText, Lightbulb } from "lucide-react";

// ─────────────────────────────────────────────
// CAPSTONE DATA
// ─────────────────────────────────────────────
const SYSTEM_SUMMARY = `i-PESO is a web-based Public Employment Service Office (PESO) management system designed for local government units. It serves three main user roles — Job Seekers, Employers, and PESO Administrators — solving the problem of manual, paper-based employment facilitation by digitizing job matching, applicant tracking, DOLE reporting, and government program management.`;

const FEATURE_MATRIX = [
  { no: 1,  feature: "Admin Dashboard & Analytics",        role: "Administrator",    key: "Real-time KPIs, charts, labor analytics",         priority: "High" },
  { no: 2,  feature: "Job Seeker Registration & Profile",  role: "Job Seeker",       key: "Multi-step onboarding, skills & work history",    priority: "High" },
  { no: 3,  feature: "Employer Registration & Onboarding", role: "Employer",         key: "Company profile, verification workflow",          priority: "High" },
  { no: 4,  feature: "Job Posting Management",             role: "Employer / Admin", key: "Create, edit, approve, archive job posts",       priority: "High" },
  { no: 5,  feature: "Smart Job Matching (AI)",            role: "Administrator",    key: "AI-driven seeker-to-job matching with scores",   priority: "High" },
  { no: 6,  feature: "Applicant Tracking System (ATS)",    role: "Employer",         key: "Pipeline, status updates, interview scheduling", priority: "High" },
  { no: 7,  feature: "Interview Calendar",                 role: "Employer",         key: "Calendar view, interview slot management",       priority: "Medium" },
  { no: 8,  feature: "Job Fair Management",                role: "Admin / Seeker",   key: "Create fairs, seeker registration, attendance",  priority: "Medium" },
  { no: 9,  feature: "Government Programs (DOLE)",         role: "Admin / Seeker",   key: "Program listings, applications, tracking",       priority: "High" },
  { no: 10, feature: "DOLE Reporting (PEIS / NERPS)",      role: "Administrator",    key: "Establishment & placement report generation",    priority: "High" },
  { no: 11, feature: "SMS Notifications",                  role: "Admin / Employer", key: "Template-based SMS for alerts & updates",        priority: "Medium" },
  { no: 12, feature: "Labor Analytics & Location Quality", role: "Administrator",    key: "Gender, skills, vacancy distribution charts",    priority: "Medium" },
  { no: 13, feature: "AI Chatbot (Isko)",                  role: "All Users",        key: "Intelligent assistant for common inquiries",     priority: "Medium" },
  { no: 14, feature: "Role & Staff Management",            role: "Administrator",    key: "RBAC, staff accounts, permissions",              priority: "Medium" },
  { no: 15, feature: "Content & Announcements Module",     role: "Administrator",    key: "Portal content management, announcements",       priority: "Low" },
];

const ADVISER_COMMENTS = {
  system: [
    "Cross-platform architecture: web for management and mobile for job seekers.",
    "Establish dedicated landing pages for both admin and employer interfaces.",
    "Feature real-time status and establishment reports on the admin dashboard.",
    "Integrate an intelligent chatbot to assist users with common inquiries.",
    "Utilize GPS and user interests for personalized local job matching.",
    "Visualize gender, skills, and vacancy distributions via comprehensive data analytics.",
    "Implement predictive modeling to forecast top job trends next month.",
    "Develop an automated resume builder and e-certificate upload functionality.",
  ],
  document: [
    "Ensure all study references are published within the last five years.",
    "Refine the definition of terms to reflect operational study usage.",
    "Expand the project scope to include international hiring and seekers.",
    "Acquire comprehensive data regarding the total population of job seekers.",
    "Compile detailed information concerning the local Technical Vocational training programs.",
    "Gather essential data regarding available livelihood programs for the community.",
    "Secure the PESO Citizen Charter to clarify office roles and responsibilities.",
    "Standardize registration labels to Surname, First Name, and Middle Initial.",
    "Consult DOLE regarding system protocols once an employer hires applicants.",
    "Execute the removal of SPES documentation from the manuscript appendices.",
    "Adopt a mixed methods approach for the study research design.",
    "Utilize quantitative tools for acceptability and qualitative for user experience.",
    "Apply appropriate formulas for management, posting, matching, and report generation.",
  ],
};

// ─────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────
const INTENTS = [
  { id: "summary",          keywords: ["summary","objective","overview","about","what is","what's","ipeso","i-peso","describe","system"] },
  { id: "features",         keywords: ["feature","module","function","functionality","list","matrix","capabilities"] },
  { id: "adviser_system",   keywords: ["adviser","advisor","comment","suggestion","feedback","system comment","panel","application"] },
  { id: "adviser_document", keywords: ["document","manuscript","research","paper","scope","reference","formula","methodology","study"] },
  { id: "help",             keywords: ["help","hi","hello","hey","start","what can you do","guide","isko"] },
];

const CHIP_INTENT_MAP = {
  "System Summary":               "summary",
  "Show Feature Matrix":          "features",
  "Adviser Comments (System)":    "adviser_system",
  "Adviser Comments (Document)":  "adviser_document",
  "Document Suggestions":         "adviser_document",
  "System Suggestions":           "adviser_system",
};

function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.keywords.some((kw) => lower.includes(kw))) return intent.id;
  }
  return "default";
}

function generateBotResponse(intentId) {
  const map = {
    help: {
      text: "Hi there! 👋 I'm Isko, the i-PESO AI Assistant. Here's what I can help you with:",
      cardType: null,
      chips: ["System Summary", "Show Feature Matrix", "Adviser Comments (System)", "Adviser Comments (Document)"],
    },
    summary: {
      text: "Here's the System Summary & Core Objective for i-PESO:",
      cardType: "summary",
      chips: ["Show Feature Matrix", "Adviser Comments (System)", "Adviser Comments (Document)"],
    },
    features: {
      text: "Here's the Summary Matrix of Major Features — 15 modules across 3 user roles:",
      cardType: "features",
      chips: ["System Summary", "Adviser Comments (System)", "Adviser Comments (Document)"],
    },
    adviser_system: {
      text: "Here are the Adviser's Comments & Suggestions on the System/Application:",
      cardType: "adviser_system",
      chips: ["Adviser Comments (Document)", "System Summary", "Show Feature Matrix"],
    },
    adviser_document: {
      text: "Here are the Adviser's Comments & Suggestions on the Document/Manuscript:",
      cardType: "adviser_document",
      chips: ["Adviser Comments (System)", "System Summary", "Show Feature Matrix"],
    },
    default: {
      text: "I'm not sure I understand that, but here's what I can help you with! Try one of the quick options below, or ask me about i-PESO features, objectives, or adviser feedback.",
      cardType: null,
      chips: ["System Summary", "Show Feature Matrix", "Adviser Comments (System)"],
    },
  };
  return map[intentId] || map.default;
}

// ─────────────────────────────────────────────
// RICH CARDS
// ─────────────────────────────────────────────
function SystemSummaryCard() {
  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 overflow-hidden text-sm">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white font-semibold text-xs uppercase tracking-wide">
        <FileText size={12} /> 1. System Summary &amp; Core Objective
      </div>
      <p className="p-3 text-gray-700 dark:text-gray-200 leading-relaxed text-[12px]">{SYSTEM_SUMMARY}</p>
    </div>
  );
}

function FeatureMatrixCard() {
  return (
    <div className="mt-2 rounded-xl border border-indigo-100 dark:border-indigo-900 overflow-hidden text-[11px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white font-semibold text-xs uppercase tracking-wide">
        <LayoutList size={12} /> 2. Summary Matrix of Major Features
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase">
              <th className="p-1.5 border border-gray-200 dark:border-gray-700 text-center w-6">#</th>
              <th className="p-1.5 border border-gray-200 dark:border-gray-700 text-left">Feature / Module Name</th>
              <th className="p-1.5 border border-gray-200 dark:border-gray-700 text-left">Target User Role</th>
              <th className="p-1.5 border border-gray-200 dark:border-gray-700 text-left">Key Functionality &amp; Purpose</th>
              <th className="p-1.5 border border-gray-200 dark:border-gray-700 text-center">Priority Level</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_MATRIX.map((row, i) => (
              <tr key={row.no} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                <td className="p-1.5 border border-gray-200 dark:border-gray-700 text-center text-gray-400">{row.no}</td>
                <td className="p-1.5 border border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">{row.feature}</td>
                <td className="p-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{row.role}</td>
                <td className="p-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{row.key}</td>
                <td className="p-1.5 border border-gray-200 dark:border-gray-700 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                    row.priority === "High"   ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                    row.priority === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" :
                                               "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  }`}>{row.priority}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdviserCommentsCard({ type }) {
  const isSystem = type === "system";
  const items = isSystem ? ADVISER_COMMENTS.system : ADVISER_COMMENTS.document;
  const label = isSystem ? "A. System and/or Application" : "B. Document / Manuscript";
  const headerColor = isSystem ? "bg-amber-600" : "bg-teal-600";
  const wrapClass = isSystem
    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900"
    : "bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900";

  return (
    <div className={`mt-2 rounded-xl border overflow-hidden ${wrapClass}`}>
      <div className={`flex items-center gap-2 px-3 py-2 text-white font-semibold text-xs uppercase tracking-wide ${headerColor}`}>
        <Lightbulb size={12} /> Comments &amp; Suggestions — {label}
      </div>
      <ol className="p-3 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-gray-700 dark:text-gray-200 text-[11px] leading-snug">
            <span className="shrink-0 text-gray-400 font-mono text-[10px] mt-0.5">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex space-x-1 items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm w-16">
    <motion.div className="w-2 h-2 bg-primary rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
    <motion.div className="w-2 h-2 bg-primary rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
    <motion.div className="w-2 h-2 bg-primary rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
  </div>
);

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────
function MessageBubble({ msg, onChipClick }) {
  const isBot = msg.sender === "bot";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}
    >
      <div className={`flex items-end gap-2 mb-1 ${isBot ? "" : "flex-row-reverse"}`}>
        {isBot ? (
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
            <Bot size={14} className="text-primary" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mb-1">
            <User size={14} className="text-gray-500 dark:text-gray-300" />
          </div>
        )}
        <div className={`max-w-[90%] text-sm shadow-sm ${
          isBot
            ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700 p-3"
            : "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3"
        }`}>
          <span>{msg.text}</span>
          {msg.cardType === "summary"         && <SystemSummaryCard />}
          {msg.cardType === "features"        && <FeatureMatrixCard />}
          {msg.cardType === "adviser_system"  && <AdviserCommentsCard type="system" />}
          {msg.cardType === "adviser_document"&& <AdviserCommentsCard type="document" />}
          {msg.chips && msg.chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {msg.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onChipClick(chip)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-white dark:text-blue-400 dark:border-blue-500 dark:hover:bg-blue-600 dark:hover:text-white transition-all font-medium"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-gray-400 px-8">{msg.time}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN WIDGET
// ─────────────────────────────────────────────
export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hi! 👋 I'm Isko, your i-PESO Assistant. I can help you explore the system's features, objectives, and adviser feedback. What would you like to know?",
      cardType: null,
      chips: ["System Summary", "Show Feature Matrix", "Adviser Comments (System)", "Adviser Comments (Document)"],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const processMessage = (text) => {
    const userMsg = {
      id: Date.now(),
      sender: "user",
      text,
      cardType: null,
      chips: [],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const intentId = CHIP_INTENT_MAP[text] ?? detectIntent(text);
      const response = generateBotResponse(intentId);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: response.text,
          cardType: response.cardType,
          chips: response.chips || [],
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    processMessage(input.trim());
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="mb-4 w-[370px] sm:w-[430px] h-[590px] max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-white shadow-md z-10 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-tight">Isko — i-PESO Assistant</h3>
                  <p className="text-xs text-primary-foreground/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Online · Ask me about i-PESO
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onChipClick={processMessage} />
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-end space-x-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
                      <Bot size={14} className="text-primary" />
                    </div>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about features, comments, summary..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={28} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
