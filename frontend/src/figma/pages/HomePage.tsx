"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Settings } from "lucide-react";
import AgentSpace from "../components/AgentSpace";
import QuestBoard from "../components/QuestBoard";
import AIFeedbackBar from "../components/AIFeedbackBar";

export default function HomePage() {
  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <motion.header
        className="absolute top-8 left-8 right-8 flex items-center justify-between z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif)" }}>
            MagicLearn
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">AI 魔法伙伴</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="px-4 py-2 glass-panel rounded-2xl text-sm hover:bg-white/10 transition-colors"
          >
            管理后台
          </Link>
          <button className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      <div className="pt-28 pb-32 h-screen flex gap-6">
        <div className="w-[40%]">
          <AgentSpace />
        </div>

        <div className="flex-1">
          <QuestBoard />
        </div>
      </div>

      <AIFeedbackBar />
    </div>
  );
}
