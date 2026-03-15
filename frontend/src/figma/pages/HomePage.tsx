"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import MerlinGenerator from "../components/MerlinGenerator";
import QuestBoard from "../components/QuestBoard";
import AIFeedbackBar from "../components/AIFeedbackBar";

export default function HomePage() {
  const leftPanelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const updateLeftHeight = () => {
      const leftPanel = leftPanelRef.current;
      const rightLast = document.querySelector('[data-marker="quest-last"]') as HTMLElement | null;
      if (!leftPanel || !rightLast) return;
      const leftTop = leftPanel.getBoundingClientRect().top;
      const rightBottom = rightLast.getBoundingClientRect().bottom;
      const nextHeight = Math.max(0, Math.round(rightBottom - leftTop));
      leftPanel.style.height = `${nextHeight}px`;
    };

    const rafUpdate = () => requestAnimationFrame(updateLeftHeight);
    rafUpdate();
    window.addEventListener("resize", rafUpdate);
    return () => window.removeEventListener("resize", rafUpdate);
  }, []);

  return (
    <div className="h-screen p-8 relative overflow-hidden flex flex-col">
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
      <div className="pt-28 pb-32 mt-[22px] flex-1 min-h-0 flex gap-6 items-start">
        {/* 左侧 - Agent 伴随舱 */}
        <div className="w-[40%] min-h-0" ref={leftPanelRef}>
          <MerlinGenerator />
        </div>

        {/* 右侧 - 任务看板 */}
        <div className="flex-1 min-h-0">
          <QuestBoard />
        </div>
      </div>

      {/* 底部实时反馈舱 */}
      <AIFeedbackBar />
    </div>
  );
}
