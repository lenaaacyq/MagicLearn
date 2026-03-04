"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getQuestionItems } from "../../data/questionBank";
import { markQuestionComplete } from "../../data/progressStore";

interface ListeningQuestionProps {
  onComplete: () => void;
}

type PlayState = "playing-first" | "playing-second" | "ready";

export default function ListeningQuestion({ onComplete }: ListeningQuestionProps) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [playState, setPlayState] = useState<PlayState>("playing-first");
  const [activeSpeaker, setActiveSpeaker] = useState<"left" | "right">("left");
  const [showToast, setShowToast] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number | null>(null);
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const timersRef = useRef<number[]>([]);
  const typingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wrongSfxRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [items, setItems] = useState(() => getQuestionItems("listening"));
  useEffect(() => {
    const refresh = () => setItems(getQuestionItems("listening"));
    refresh();
    window.addEventListener("magic-user-question-updated", refresh);
    return () => {
      window.removeEventListener("magic-user-question-updated", refresh);
    };
  }, []);
  const introMessage = useMemo(() => "🪄 仔细辨认风中的魔法回音，提取关键的线索。", []);
  const correctMessage = useMemo(() => "✨ 你成功破译了魔法密语，太敏锐了！", []);
  const incorrectMessage = useMemo(() => "🔮 咒语破译失败，深呼吸调整状态，", []);
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

  const dialogueEntries = useMemo(() => {
    return current?.material?.dialogue || [];
  }, [current]);

  const playSequence = useMemo(() => {
    if (!current) return [];
    const totalMs = Math.max(
      4000,
      audioDurationMs ?? (current.material?.audio?.duration || 12) * 1000
    );
    const lines = Math.max(dialogueEntries.length, 1);
    const perLine = Math.floor(totalMs / lines);
    return dialogueEntries.map((entry, index) => {
      const role = String(entry?.role || "").trim().toLowerCase();
      const speaker: "left" | "right" = role.startsWith("w")
        ? "left"
        : role.startsWith("m")
        ? "right"
        : index % 2 === 0
        ? "left"
        : "right";
      return { speaker, duration: perLine };
    });
  }, [current, dialogueEntries, audioDurationMs]);
  const showQuestion = playState === "ready";
  const leftName = "W";
  const rightName = "M";

  useEffect(() => {
    if (!current) return;
    setAudioDurationMs(null);
    setAudioErrorMessage(null);
    setHasUserStarted(false);
    const src = current.material?.audio?.src ?? null;
    if (src) {
      setAudioSrc(src);
      setAudioStatus("loading");
      return;
    }
    setAudioStatus("error");
    setAudioErrorMessage("音频资源缺失，请刷新重试");
    setAudioSrc(null);
  }, [current?.id]);

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

  useEffect(() => {
    if (!audioSrc) {
      audioRef.current = null;
      return;
    }
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    const handleLoaded = () => {
      setAudioDurationMs(Math.max(0, audio.duration * 1000));
      setAudioStatus("ready");
    };
    const handleError = () => {
      setAudioStatus("error");
      setAudioErrorMessage("音频加载失败，请刷新重试");
    };
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("error", handleError);
    };
  }, [audioSrc]);

  useEffect(() => {
    if (!current) return;
    if (audioStatus === "error") {
      setPlayState("playing-first");
      setShowToast(false);
      return;
    }
    if (!hasUserStarted) return;
    if (audioStatus === "loading") return;
    const timers: number[] = [];
    setSelectedOption(null);
    setIsAnswered(false);
    setShowToast(false);

    const playCycle = (index: number, cycle: "first" | "second") => {
      if (index === 0 && audioRef.current && audioStatus === "ready") {
        const audio = audioRef.current;
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      if (index >= playSequence.length) {
        if (cycle === "first") {
          setShowToast(true);
          timers.push(
            window.setTimeout(() => {
              setShowToast(false);
              setPlayState("playing-second");
              playCycle(0, "second");
            }, 1200)
          );
        } else {
          setPlayState("ready");
        }
        return;
      }

      const step = playSequence[index];
      setActiveSpeaker(step.speaker);
      timers.push(
        window.setTimeout(() => {
          playCycle(index + 1, cycle);
        }, step.duration)
      );
    };

    setPlayState("playing-first");
    playCycle(0, "first");

    timersRef.current = timers;
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, [current?.id, playSequence, audioStatus, hasUserStarted]);

  useEffect(() => {
    if (playState === "ready" && audioRef.current) {
      audioRef.current.pause();
    }
  }, [playState]);

  useEffect(() => {
    if (!showQuestion || !current) return;
    runTyping(introMessage);
    return () => {
      if (typingTimer.current) {
        clearInterval(typingTimer.current);
      }
    };
  }, [showQuestion, introMessage, current?.id]);

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
    markQuestionComplete("listening", current.id);
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    onComplete();
  };

  const handleStartListening = () => {
    setHasUserStarted(true);
    setPlayState("playing-first");
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };


  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">暂无听力题</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/figma-bg/aibg3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center -20%",
          backgroundRepeat: "no-repeat",
          filter: "blur(2px) brightness(0.82)"
        }}
      >
        <div className="absolute inset-0 bg-[var(--mystical-navy)]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(138,43,226,0.4),transparent_55%)]" />
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
        <div className="absolute left-20 bottom-[132px] flex items-end gap-4">
          <motion.div
            className={`relative ${activeSpeaker === "left" ? "" : "opacity-60"}`}
            animate={activeSpeaker === "left" ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <div className="w-36 h-36 glass-panel rounded-3xl flex items-center justify-center text-[92px]">
              🧙‍♀️
            </div>
            <div className="absolute -top-3 -right-3 px-3 py-1 bg-[var(--mystical-purple)] rounded-full text-xs font-semibold">
              {leftName}
            </div>
            <div className="absolute -right-14 top-7 w-24 h-14 rounded-2xl glass-panel flex items-center justify-center">
              <div className="flex items-end gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-2 rounded-full bg-[var(--neon-gold)]"
                    animate={{
                      height: activeSpeaker === "left" ? [8, 24, 12] : 8
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: activeSpeaker === "left" ? Infinity : 0,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute right-20 bottom-[132px] flex items-end gap-4">
          <motion.div
            className={`relative ${activeSpeaker === "right" ? "" : "opacity-60"}`}
            animate={activeSpeaker === "right" ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <div className="w-36 h-36 glass-panel rounded-3xl flex items-center justify-center text-[92px]">
              🧙‍♂️
            </div>
            <div className="absolute -top-3 -left-3 px-3 py-1 bg-[var(--mystical-purple)] rounded-full text-xs font-semibold">
              {rightName}
            </div>
            <div className="absolute -left-14 top-7 w-24 h-14 rounded-2xl glass-panel flex items-center justify-center">
              <div className="flex items-end gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-2 rounded-full bg-[var(--neon-gold)]"
                    animate={{
                      height: activeSpeaker === "right" ? [8, 24, 12] : 8
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: activeSpeaker === "right" ? Infinity : 0,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showToast && (
            <motion.div
              className="absolute top-24 inset-x-0 flex justify-center px-6 py-3 rounded-full glass-panel text-base"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              再听一次，保持专注！
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {audioStatus === "error" && audioErrorMessage && (
            <motion.div
              className="absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-red-500/30 border border-red-500 text-base"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {audioErrorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!showQuestion && audioStatus === "ready" && !hasUserStarted && (
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                className="px-6 py-3 rounded-2xl bg-[var(--neon-gold)] text-[var(--mystical-navy)] font-semibold"
                onClick={handleStartListening}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                开始播放
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showQuestion && (
            <motion.div
              className="flex-1 flex items-center justify-center px-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-full max-w-3xl">
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="glass-panel rounded-3xl p-5">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                        <span>Listening Question</span>
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
                        transition={{ delay: 0.2 + index * 0.1 }}
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
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showQuestion && (
            <motion.div
              className="relative z-20 px-12 pb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
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
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showQuestion && !isAnswered && (
          <motion.div
            className="absolute inset-0 bg-black/35 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
