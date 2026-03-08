"use client";

import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import MerlinGenerator from "../components/MerlinGenerator";
import QuestBoard from "../components/QuestBoard";
import AIFeedbackBar from "../components/AIFeedbackBar";

export default function HomePage() {
  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      {/* 顶部导航 */}
      <motion.header 
        className="absolute top-8 left-8 right-8 flex items-center justify-between z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>
            MagicLearn
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">AI 魔法伙伴</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* 主内容区 - Bento 布局 */}
      <div className="pt-28 pb-32 h-screen flex gap-6">
        {/* 左侧 - Agent 伴随舱 (40%) */}
        <div className="w-[40%]">
          <MerlinGenerator />
        </div>

        {/* 右侧 - 任务看板 (60%) */}
        <div className="flex-1">
          <QuestBoard />
        </div>
      </div>

      {/* 底部实时反馈舱 */}
      <AIFeedbackBar />
    </div>
  );
}
