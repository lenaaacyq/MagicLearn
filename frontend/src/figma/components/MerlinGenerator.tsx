"use client";

import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveUserQuestionItems } from "../data/questionBank";

type Material = {
  kind: string;
  text?: string;
  transcript?: string;
  audio?: { src?: string; duration?: number };
  dialogue?: Array<{ role: string; text: string }>;
} | null;

type ApiRecord = {
  text?: string;
  type?: string;
  answer?: string;
  tags?: string[];
  material?: Material;
  options?: string[];
};

const optionLabels = ["A", "B", "C", "D", "E", "F", "G"];

const parseOptionsFromText = (
  text: string
): { question: string; options?: string[]; answer?: string } => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const optionRegex = /^([A-G])[).:：]\s*(.+)$/;
  const answerRegex = /^(answer|答案|correct answer)\s*[:：]\s*([A-G])\b/i;
  const options: Array<{ id: string; value: string }> = [];
  const kept: string[] = [];
  let detectedAnswer: string | undefined;
  for (const line of lines) {
    const match = optionRegex.exec(line);
    if (match) {
      options.push({ id: match[1], value: match[2] });
      continue;
    }
    const answerMatch = answerRegex.exec(line);
    if (answerMatch) {
      detectedAnswer = answerMatch[2].toUpperCase();
      continue;
    }
    kept.push(line);
  }
  const result = { question: kept.join("\n"), answer: detectedAnswer };
  if (options.length) {
    return { ...result, options: options.map((item) => item.value) };
  }
  return result;
};

const normalizeAnswer = (
  raw: string | undefined,
  options: Array<{ id: string; text: string }>,
  fallback?: string
) => {
  const candidate = (raw || "").trim();
  const letterMatch = candidate.match(/[A-G]/i);
  if (letterMatch) {
    return letterMatch[0].toUpperCase();
  }
  const normalizedCandidate = candidate.toLowerCase();
  if (normalizedCandidate) {
    const matched = options.find(
      (option) => option.text.trim().toLowerCase() === normalizedCandidate
    );
    if (matched) {
      return matched.text;
    }
  }
  return fallback || "";
};

const setGlobalMerlinTip = (message: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    "magic_merlin_tip_v1",
    JSON.stringify({ message, updatedAt: Date.now() })
  );
};

const runTransformAndPreview = async () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 45000);
  try {
    const transformResponse = await fetch("/api/knowledge-base/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        persona: "mentor",
        tone: "warm",
        scene: "great_hall",
        ritual: "quest"
      })
    });
    if (!transformResponse.ok) {
      const errorText = await transformResponse.text();
      throw new Error(errorText || "魔法改写失败");
    }
    await fetch("/api/knowledge-base/compare", { method: "GET" }).catch(() => {});
  } finally {
    window.clearTimeout(timer);
  }
};

export default function MerlinGenerator() {
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [slowNotified, setSlowNotified] = useState(false);
  const mountedRef = useRef(true);
  const generationStartRef = useRef<number | null>(null);
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const start = generationStartRef.current ?? Date.now();
    generationStartRef.current = start;
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSeconds(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    if (slowNotified) return;
    if (elapsedSeconds < 20) return;
    setGlobalMerlinTip("生成中耗时较长，先去练习页也没关系，完成后会提醒你");
    setSlowNotified(true);
  }, [elapsedSeconds, isGenerating, slowNotified]);

  const handleGenerate = async () => {
    const content = inputText.trim();
    if (!content) return;
    const isListeningRequest = /听力/i.test(content) || /listening/i.test(content);
    if (mountedRef.current) setUploadError(null);
    setIsGenerating(true);
    setGeneratedCount(null);
    const startTime = Date.now();
    generationStartRef.current = startTime;
    setElapsedSeconds(0);
    setSlowNotified(false);
    setGlobalMerlinTip("正在为你魔法改写，可以返回用户页进行其它任务");
    try {
      const response = await fetch("/api/knowledge-base/upload-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content })
      });
      let errorText = "";
      let data: { records?: ApiRecord[] } | null = null;
      if (!response.ok) {
        errorText = await response.text();
      } else {
        data = await response.json();
      }
      if (isListeningRequest) {
        const elapsed = Date.now() - startTime;
        const waitMs = Math.max(0, 30000 - elapsed);
        if (waitMs) {
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        }
        const message = "生成失败，请稍后再试";
        if (mountedRef.current) setUploadError(message);
        setGlobalMerlinTip(message);
        return;
      }
      if (!response.ok) {
        throw new Error(errorText || "文本提交失败");
      }
      const records = Array.isArray(data?.records) ? data.records : [];
      const now = Date.now();
      const items = records.map((record, index) => {
        const rawType = String(record.type || "grammar").toLowerCase();
        const type = (rawType === "reading" || rawType === "listening" ? rawType : "grammar") as
          | "grammar"
          | "reading"
          | "listening";
        const rawText = String(record.text || "");
        const parsed = parseOptionsFromText(rawText);
        const optionsSource = Array.isArray(record.options) && record.options.length ? record.options : parsed.options || [];
        const options = optionsSource.map((text, optionIndex) => ({
          id: optionLabels[optionIndex] || `${optionIndex + 1}`,
          text
        }));
        const normalizedAnswer = normalizeAnswer(
          typeof record.answer === "string" ? record.answer : undefined,
          options,
          parsed.answer
        );
        const tagsValue = record.tags;
        const tags = Array.isArray(tagsValue) ? tagsValue : [];
        const material =
          record.material && typeof record.material === "object" && typeof record.material.kind === "string"
            ? record.material
            : undefined;
        return {
          id: `user-${now}-${index}`,
          groupId: "user-text",
          type,
          material,
          stem: parsed.question,
          options,
          answer: normalizedAnswer,
          tags,
          isNew: true,
          createdAt: now - index
        };
      });
      if (items.length) {
        saveUserQuestionItems(items);
      }
      setGeneratedCount(records.length);
      if (mountedRef.current) {
        setInputText("");
      }
      void runTransformAndPreview()
        .then(() => {
          if (!mountedRef.current) return;
          const message = records.length
            ? `已生成 ${records.length} 条题目`
            : "已生成题目";
          setGlobalMerlinTip(message);
        })
        .catch(() => {
          if (!mountedRef.current) return;
          setGlobalMerlinTip("好像出了点问题...请稍后再试");
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : "文本提交失败";
      if (mountedRef.current) setUploadError(message);
      setGlobalMerlinTip("好像出了点问题...请稍后再试");
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  };

  const statusText = uploadError
    ? uploadError
    : generatedCount !== null
      ? `已生成 ${generatedCount} 条题目`
      : "把需求告诉梅林，他会帮你生成专属题库";

  return (
    <motion.div
      className="glass-panel rounded-[32px] p-8 flex flex-col h-full relative overflow-hidden"
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

      <div className="flex flex-col items-center gap-4 z-10">
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
          <div className="w-32 h-32 rounded-full glass-panel-gold flex items-center justify-center relative overflow-hidden border-2 border-[var(--neon-gold)]/30">
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
              <div className="text-[80px] leading-none">🧙‍♂️</div>
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

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-[var(--mystical-purple)] blur-xl opacity-30 rounded-full" />
        </motion.div>

        <h3 className="text-lg font-semibold text-[var(--neon-gold)]">
          魔法导师 梅林
        </h3>
        <motion.div
          className="relative glass-panel-gold rounded-3xl px-5 py-3 max-w-[260px] self-end -mt-2 mr-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="absolute -top-3 left-6 w-5 h-5 bg-[rgba(20,25,50,0.5)] backdrop-blur-[24px] rotate-45 border-l border-t border-[rgba(255,215,0,0.2)]" />
          <p className={`text-xs leading-relaxed ${uploadError ? "text-[#FF6B4A]" : "text-[var(--foreground)]/80"}`}>
            {uploadError ? uploadError : "把枯燥的题目扔进来，创造魔法题库！"}
          </p>
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 z-10 mt-4 px-2">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (event.shiftKey) return;
              event.preventDefault();
              handleGenerate();
            }}
            placeholder="例如：请生成 8 道语法题，考点是虚拟语气，难度 3，四选一，答案用 A/B/C/D。"
            className="w-full h-28 glass-panel rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--neon-gold)]/50 transition-colors placeholder:text-[var(--muted-foreground)]/50"
          />

          <div className="absolute bottom-3 right-4 text-xs text-[var(--muted-foreground)]/50">
            {inputText.length} / 500
          </div>
        </motion.div>

        <motion.button
          onClick={handleGenerate}
          disabled={isGenerating || !inputText.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--neon-gold)] to-[var(--emerald-green)] text-[var(--mystical-navy)] font-semibold text-lg flex items-center justify-center gap-3 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={!isGenerating && inputText.trim() ? { scale: 1.02 } : {}}
          whileTap={!isGenerating && inputText.trim() ? { scale: 0.98 } : {}}
        >
          {!isGenerating && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ["-100%", "200%"]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="relative z-10">生成中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span className="relative z-10">生成魔法题库</span>
            </>
          )}
        </motion.button>

      </div>
    </motion.div>
  );
}
