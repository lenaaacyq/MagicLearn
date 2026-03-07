"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getQuestionItems } from "../../data/questionBank";
import { markQuestionComplete } from "../../data/progressStore";

interface GrammarQuestionProps {
  onComplete: () => void;
}

export default function GrammarQuestion({ onComplete }: GrammarQuestionProps) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const typingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrongSfxRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [items, setItems] = useState(() => getQuestionItems("grammar"));
  useEffect(() => {
    const refresh = () => setItems(getQuestionItems("grammar"));
    refresh();
    window.addEventListener("magic-user-question-updated", refresh);
    return () => {
      window.removeEventListener("magic-user-question-updated", refresh);
    };
  }, []);
  const introMessage = useMemo(
    () => "🪄 找出那个最关键的魔法词汇，让静止的咒语动起来。",
    []
  );
  const correctMessage = useMemo(
    () => "✨ 魔力满分，你成功施放了一个超强力的咒语！",
    []
  );
  const incorrectMessage = useMemo(
    () => "🔮 糟糕，刚才的咒语差点把茶杯变成蛤蟆！",
    []
  );
  const sparkles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        duration: 8 + (index % 4),
        delay: index % 3
      })),
    []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = items.length;
  const current = items[currentIndex];

  const runTyping = (fullText: string) => {
    if (typingTimer.current) {
      clearInterval(typingTimer.current);
    }
    let index = 0;
    setDisplayText("");
    setIsTyping(true);
    typingTimer.current = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        setIsTyping(false);
        if (typingTimer.current) {
          clearInterval(typingTimer.current);
        }
      }
    }, 30);
  };

  useEffect(() => {
    if (!current) return;
    runTyping(introMessage);
    setSelectedOption(null);
    setIsAnswered(false);
    return () => {
      if (typingTimer.current) {
        clearInterval(typingTimer.current);
      }
    };
  }, [current?.id, introMessage]);

  useEffect(() => {
    wrongSfxRef.current = new Audio("/audio/sfx-wrong.ogg");
    if (wrongSfxRef.current) {
      wrongSfxRef.current.volume = 0.6;
    }
    return () => {
      wrongSfxRef.current = null;
    };
  }, []);

  const playCorrectChime = () => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    const now = context.currentTime;
    const gain = context.createGain();
    const osc1 = context.createOscillator();
    const osc2 = context.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(988, now);
    osc2.frequency.setValueAtTime(1319, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(context.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  };

  const playSfx = (isCorrect: boolean) => {
    if (isCorrect) {
      playCorrectChime();
      return;
    }
    const audio = wrongSfxRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleOptionClick = (optionId: string) => {
    if (isAnswered) return;
    const selected = current.options.find((option) => option.id === optionId);
    const isCorrect =
      selected?.text === current.answer || selected?.id === current.answer;
    setSelectedOption(optionId);
    setIsAnswered(true);
    runTyping(isCorrect ? correctMessage : incorrectMessage);
    playSfx(isCorrect);
  };

  const handleClose = () => {
    router.push("/");
  };

  const handleNext = () => {
    if (!current) return;
    markQuestionComplete("grammar", current.id);
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    onComplete();
  };

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">暂无语法题</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 kb-bg-base kb-bg-grammar">
        <div className="absolute inset-0 bg-[var(--mystical-navy)]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(138,43,226,0.4),transparent_55%)]" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute text-2xl opacity-10"
            style={{
              left: sparkle.left,
              top: sparkle.top
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.05, 0.15, 0.05],
              rotate: [0, 360]
            }}
            transition={{
              duration: sparkle.duration,
              repeat: Infinity,
              delay: sparkle.delay
            }}
          >
            {["✨", "⭐", "🌟", "✦", "◆"][sparkle.id % 5]}
          </motion.div>
        ))}
      </div>

      <motion.button
        className="absolute top-8 right-8 z-50 w-12 h-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleClose}
      >
        <X className="w-6 h-6" />
      </motion.button>

      <div className="relative z-10 w-full h-full flex flex-col">
        <motion.div
          className="absolute left-12 bottom-32 flex items-end gap-4"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: "var(--mystical-purple)" }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity
              }}
            />
            <div className="relative w-32 h-32 glass-panel rounded-3xl flex items-center justify-center text-[80px]">
              🧙‍♂️
            </div>
            <div className="absolute -top-3 -right-3 px-3 py-1 bg-[var(--mystical-purple)] rounded-full text-xs font-semibold">
              Merlin
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          <motion.div
            className="flex-1 flex items-center justify-center px-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-full max-w-3xl">
              <motion.div
                key={current.id}
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="glass-panel rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                      <span>咒语语法课</span>
                      {current.isNew && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[var(--neon-gold)]/20 text-[var(--neon-gold)] border border-[var(--neon-gold)]/30">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {currentIndex + 1} / {total}
                    </div>
                  </div>
                  <p className="text-lg text-[var(--foreground)]/90 leading-relaxed">
                    {current.stem}
                  </p>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                {current.options.map((option, index) => {
                  const isSelected = selectedOption === option.id;
                  const isCorrect =
                    option.text === current.answer || option.id === current.answer;
                  const showResult = isAnswered;

                  return (
                    <motion.button
                      key={option.id}
                      className={`relative p-6 rounded-3xl text-left transition-all duration-300 ${
                        !showResult && "glass-panel hover:bg-white/10 cursor-pointer"
                      } ${
                        showResult && isSelected && isCorrect &&
                        "bg-[var(--emerald-green)]/30 border-2 border-[var(--emerald-green)]"
                      } ${
                        showResult && isSelected && !isCorrect &&
                        "bg-red-500/30 border-2 border-red-500"
                      } ${
                        showResult && !isSelected && isCorrect &&
                        "bg-[var(--emerald-green)]/20 border border-[var(--emerald-green)]"
                      } ${showResult && !isSelected && !isCorrect && "opacity-50"}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      onClick={() => handleOptionClick(option.id)}
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { scale: 1.03, y: -4 } : {}}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                            !showResult && "bg-white/10"
                          } ${
                            showResult && isSelected && isCorrect &&
                            "bg-[var(--emerald-green)]"
                          } ${
                            showResult && isSelected && !isCorrect && "bg-red-500"
                          } ${
                            showResult && !isSelected && isCorrect &&
                            "bg-[var(--emerald-green)]/50"
                          }`}
                        >
                          {option.id}
                        </div>
                        <span className="text-lg font-medium">{option.text}</span>
                      </div>

                      {showResult && isCorrect && (
                        <motion.div
                          className="absolute top-4 right-4"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <Sparkles className="w-6 h-6 text-[var(--emerald-green)]" />
                        </motion.div>
                      )}

                      {!showResult && (
                        <motion.div
                          className="absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(255, 215, 0, 0.1))"
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.div
          className="relative z-20 px-12 pb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="glass-panel rounded-3xl p-6 border-2 border-[var(--glass-border-purple)] flex items-center justify-between gap-4">
            <p className="text-lg leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
              {displayText}
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  |
                </motion.span>
              )}
            </p>
            {isAnswered && (
              <motion.button
                className="px-5 py-3 rounded-2xl bg-[var(--neon-gold)] text-[var(--mystical-navy)] font-semibold"
                onClick={handleNext}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {currentIndex < total - 1 ? "下一题" : "完成"}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div
            className="absolute inset-0 bg-black/40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
