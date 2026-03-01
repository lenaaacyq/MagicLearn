"use client";

import { motion } from "framer-motion";
import { Mail, MessageCircle, Sparkles } from "lucide-react";

export default function AIFeedbackBar() {
  return (
    <motion.div
      className="fixed bottom-6 left-0 right-0 z-40 pointer-events-none"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <div className="max-w-6xl mx-auto px-8 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--neon-gold)]/60 to-[var(--mystical-purple)]/60 flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-white/90" />
          </div>
          <span className="text-xs">
            MagicLearn Platform · AI-native English Learning
          </span>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Wechat ID: Qb876590</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            <span>欢迎反馈与建议</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
