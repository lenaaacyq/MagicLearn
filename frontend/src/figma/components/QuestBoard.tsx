"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Flame, Lock, Volume2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getQuestionItems } from "../data/questionBank";
import { getProgressPercent } from "../data/progressStore";

interface QuestCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  status: "active" | "progress" | "locked";
  glowColor: string;
  progress?: number;
  onClick?: () => void;
}

function QuestCard({
  title,
  subtitle,
  icon,
  status,
  glowColor,
  progress,
  onClick
}: QuestCardProps) {
  const isLocked = status === "locked";

  return (
    <motion.div
      className={`glass-panel rounded-3xl p-6 cursor-pointer relative overflow-hidden transition-all ${
        isLocked ? "grayscale opacity-50" : "hover:scale-[1.02]"
      }`}
      whileHover={!isLocked ? { y: -4 } : {}}
      onClick={!isLocked ? onClick : undefined}
      style={{
        boxShadow: !isLocked ? `0 8px 32px ${glowColor}40` : undefined
      }}
    >
      {!isLocked && (
        <motion.div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: glowColor }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{
            duration: 3,
            repeat: Infinity
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 -translate-y-1 ${
            isLocked ? "bg-white/5" : "glass-panel-gold"
          }`}
          style={{
            boxShadow: !isLocked ? `0 0 20px ${glowColor}60` : undefined
          }}
        >
          {isLocked ? <Lock className="w-6 h-6 text-gray-500" /> : icon}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {title}
          </h4>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            {subtitle}
          </p>

          {progress !== undefined && !isLocked && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: glowColor }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function QuestBoard() {
  const router = useRouter();
  const [listeningTotal, setListeningTotal] = useState(() => getQuestionItems("listening").length);
  const [grammarTotal, setGrammarTotal] = useState(() => getQuestionItems("grammar").length);
  const [readingTotal, setReadingTotal] = useState(() => getQuestionItems("reading").length);
  useEffect(() => {
    const refresh = () => {
      setListeningTotal(getQuestionItems("listening").length);
      setGrammarTotal(getQuestionItems("grammar").length);
      setReadingTotal(getQuestionItems("reading").length);
    };
    refresh();
    window.addEventListener("magic-user-question-updated", refresh);
    return () => {
      window.removeEventListener("magic-user-question-updated", refresh);
    };
  }, []);
  const [progress, setProgress] = useState({ listening: 0, grammar: 0, reading: 0 });

  useEffect(() => {
    setProgress({
      listening: getProgressPercent("listening", listeningTotal),
      grammar: getProgressPercent("grammar", grammarTotal),
      reading: getProgressPercent("reading", readingTotal)
    });
  }, [listeningTotal, grammarTotal, readingTotal]);

  const handleQuestClick = (questionType: string) => {
    router.push(`/question/${questionType}`);
  };

  return (
    <motion.div
      className="flex flex-col gap-6 h-full"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="glass-panel-gold rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <motion.div
            animate={{
              rotate: [0, 360]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            ✨
          </motion.div>
        </div>

        <div className="relative z-10">
          <h2 className="text-2xl mb-4 flex items-baseline gap-3" style={{ fontFamily: "var(--font-serif)" }}>
            <span>Learn with Your Own Magic</span>
          </h2>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--neon-gold)]/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-[var(--neon-gold)]" />
              </div>
              <p className="text-lg font-semibold text-[var(--neon-gold)]">7 天连胜</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--mystical-purple)]/20 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-[var(--mystical-purple)]" />
              </div>
              <p className="text-lg font-semibold text-[var(--mystical-purple)]">大魔法师</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
        <QuestCard
          title="魔法对话课"
          subtitle="Magical Dialogue · Listening"
          icon={<Volume2 className="w-6 h-6 text-[var(--mystical-purple)]" />}
          status="active"
          glowColor="var(--mystical-purple)"
          progress={progress.listening}
          onClick={() => handleQuestClick("listening")}
        />

        <QuestCard
          title="咒语语法课"
          subtitle="spell practice - Grammar"
          icon={<Wand2 className="w-6 h-6 text-[var(--emerald-green)]" />}
          status="progress"
          glowColor="var(--emerald-green)"
          progress={progress.grammar}
          onClick={() => handleQuestClick("grammar")}
        />

        <QuestCard
          title="古籍阅读课"
          subtitle="Ancient Scroll · Reading"
          icon={<BookOpen className="w-6 h-6 text-[var(--neon-gold)]" />}
          status="progress"
          glowColor="var(--neon-gold)"
          progress={progress.reading}
          onClick={() => handleQuestClick("reading")}
        />
      </div>
    </motion.div>
  );
}
