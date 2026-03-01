"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { MessageCircle, Sparkles } from "lucide-react";

export default function AgentSpace() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 29) % 100}%`,
        duration: 2 + (index % 3),
        delay: index % 2
      })),
    []
  );
  return (
    <motion.div
      className="glass-panel rounded-[32px] p-8 flex flex-col items-center justify-between h-full relative overflow-hidden"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-[var(--mystical-purple)] rounded-full"
            style={{
              left: particle.left,
              top: particle.top
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 z-10 flex-1 justify-center">
        <motion.div
          className="relative"
          animate={{
            y: [0, -10, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-56 h-56 rounded-full glass-panel-gold flex items-center justify-center relative overflow-hidden border-2 border-[var(--neon-gold)]/30">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--neon-gold)]"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            />
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--mystical-purple)]/15 to-[var(--neon-gold)]/10">
              <div className="text-[128px] leading-none">🧙‍♂️</div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--mystical-navy)]/20 rounded-full" />
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--emerald-green)] rounded-full border-2 border-[var(--mystical-navy)] flex items-center justify-center z-10"
                animate={{
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </div>

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-[var(--mystical-purple)] blur-xl opacity-30 rounded-full" />
        </motion.div>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-[var(--neon-gold)] mb-4">
            魔法导师 梅林
          </h3>

          <motion.div
            className="relative glass-panel-gold rounded-3xl px-6 py-4 max-w-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[rgba(20,25,50,0.5)] backdrop-blur-[24px] rotate-45 border-l border-t border-[rgba(255,215,0,0.2)]" />
            <div className="relative z-10 flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-[var(--neon-gold)] flex-shrink-0 mt-0.5" />
              <div>
                <motion.p
                  className="text-sm leading-relaxed"
                  animate={{
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity
                  }}
                >
                  寻找今日最适合你的魔法课程
                </motion.p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
