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
          <Link 
            href="/admin"
            className="relative px-4 py-2 glass-panel rounded-2xl text-sm hover:bg-white/10 transition-colors group"
          >
            {/* 内层边框光圈 - 简洁金色 */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'var(--neon-gold)',
                padding: '2px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'exclude',
                maskComposite: 'exclude',
              }}
              animate={{
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* 外圈扩散光晕 - 柔和金色 */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-40 blur-sm"
              style={{
                background: 'var(--neon-gold)',
              }}
              animate={{
                opacity: [0, 0.4, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            <span className="relative z-10">管理后台</span>
          </Link>
          <button className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* 主内容区 - Bento 布局 */}
      <div className="pt-28 pb-32 h-screen flex gap-6">
        {/* 左侧 - Agent 伴随舱 (40%) */}
        <div className="w-[40%]">
          <AgentSpace />
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
