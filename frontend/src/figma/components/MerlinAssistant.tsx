"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Sparkles, X } from "lucide-react";

interface MerlinAssistantProps {
  showTip: boolean;
  message: string;
  onDismiss: () => void;
}

export default function MerlinAssistant({ showTip, message, onDismiss }: MerlinAssistantProps) {
  return (
    <motion.div
      className="glass-panel rounded-[32px] p-8 flex flex-col items-center justify-between h-full relative overflow-hidden"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex flex-col items-center gap-6 z-10 flex-1 justify-center w-full">
        <motion.div
          className="relative"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-48 h-48 rounded-full glass-panel-gold flex items-center justify-center relative overflow-hidden border-2 border-[var(--neon-gold)]/30 text-[104px] leading-none cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--neon-gold)]"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.25, 0.55, 0.25]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            />
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mystical-purple)]/15 to-[var(--neon-gold)]/10">
              <div>🧙‍♂️</div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--mystical-navy)]/20 rounded-full" />
              <motion.div
                className="absolute -top-2 -right-2 w-9 h-9 bg-[var(--emerald-green)] rounded-full border-2 border-[var(--mystical-navy)] flex items-center justify-center z-10"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </motion.div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-[var(--mystical-purple)] blur-xl opacity-30 rounded-full" />
        </motion.div>

        <div className="text-center w-full">
          <h3 className="text-xl font-semibold text-[var(--neon-gold)] mb-4">
            魔法导师 梅林
          </h3>

          <AnimatePresence>
            {showTip && message && (
              <motion.div
                className="relative glass-panel-gold rounded-3xl px-6 py-4 mx-auto max-w-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[rgba(20,25,50,0.5)] backdrop-blur-[24px] rotate-45 border-l border-t border-[rgba(255,215,0,0.2)]" />
                <button
                  onClick={onDismiss}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative z-10 flex items-start gap-3 pr-7">
                  <MessageCircle className="w-5 h-5 text-[var(--neon-gold)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
