"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Wand2
} from "lucide-react";
import MerlinAssistant from "../components/MerlinAssistant";
import { saveUserQuestionItems } from "../data/questionBank";

interface GeneratedQuestion {
  id: number;
  type: 'grammar' | 'reading' | 'listening';
  question: string;
  options?: string[];
  material?: string;
}

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

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showMerlinTip, setShowMerlinTip] = useState(false);
  const [merlinMessage, setMerlinMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [slowNotified, setSlowNotified] = useState(false);
  const mountedRef = useRef(true);
  const autoDismissTimerRef = useRef<number | null>(null);
  const generationStartRef = useRef<number | null>(null);

  const optionLabels = ["A", "B", "C", "D", "E", "F", "G"];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
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
    showMerlin("生成中耗时较长，先去练习页也没关系，完成后会提醒你");
    setGlobalMerlinTip("生成中耗时较长，先去练习页也没关系，完成后会提醒你");
    setSlowNotified(true);
  }, [elapsedSeconds, isGenerating, slowNotified]);

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
      {
        kept.push(line);
      }
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

  const showMerlin = (message: string) => {
    if (!mountedRef.current) return;
    if (autoDismissTimerRef.current) {
      window.clearTimeout(autoDismissTimerRef.current);
    }
    setMerlinMessage(message);
    setShowMerlinTip(true);
    autoDismissTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setShowMerlinTip(false);
    }, 15000);
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

  const handleGenerate = async () => {
    const content = textInput.trim();
    if (!content) return;
    const isListeningRequest = /听力/i.test(content) || /listening/i.test(content);
    if (mountedRef.current) setUploadError(null);
    setIsGenerating(true);
    setGeneratedQuestions([]);
    const startTime = Date.now();
    generationStartRef.current = startTime;
    setElapsedSeconds(0);
    setSlowNotified(false);
    showMerlin("正在为你魔法改写，可以返回用户页进行其它任务");
    try {
      const debugUrl = process.env.NEXT_PUBLIC_DEBUG_SERVER_URL;
      const traceId = `upload-${Date.now()}`;
      // #region debug-point A:upload-text-start
      if (debugUrl) {
        fetch(debugUrl, {
          method: "POST",
          body: JSON.stringify({
            sessionId: "upload-text-1",
            runId: "pre-fix",
            hypothesisId: "A",
            location: "AdminPage.tsx:handleGenerate:start",
            msg: "[DEBUG] upload-text start",
            data: { traceId, textLen: content.length }
          })
        }).catch(() => {});
      }
      // #endregion
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
      // #region debug-point B:upload-text-response
      if (debugUrl) {
        fetch(debugUrl, {
          method: "POST",
          body: JSON.stringify({
            sessionId: "upload-text-1",
            runId: "pre-fix",
            hypothesisId: "B",
            location: "AdminPage.tsx:handleGenerate:response",
            msg: "[DEBUG] upload-text response",
            data: { traceId, status: response.status, ok: response.ok, errorText }
          })
        }).catch(() => {});
      }
      // #endregion
      if (isListeningRequest) {
        const elapsed = Date.now() - startTime;
        const waitMs = Math.max(0, 30000 - elapsed);
        if (waitMs) {
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        }
        const message = "生成失败，请稍后再试";
        if (mountedRef.current) setUploadError(message);
        showMerlin(message);
        setGlobalMerlinTip(message);
        return;
      }
      if (!response.ok) {
        throw new Error(errorText || "文本提交失败");
      }
      const records = Array.isArray(data?.records) ? data.records : [];
      const now = Date.now();
      const items = (records as ApiRecord[]).map((record, index) => {
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
      saveUserQuestionItems(items);
      const preview = (records as ApiRecord[]).slice(0, 3).map((record, index) => {
        const type = (record.type || "grammar") as GeneratedQuestion["type"];
        const parsed = parseOptionsFromText(String(record.text || ""));
        return {
          id: index + 1,
          type,
          question: parsed.question,
          options: parsed.options
        };
      });
      if (mountedRef.current) setGeneratedQuestions(preview);
      showMerlin("正在为你魔法改写，可以返回用户页进行其它任务");
      setGlobalMerlinTip("正在为你魔法改写，可以返回用户页进行其它任务");
      void runTransformAndPreview()
        .then(() => {
          const duration = generationStartRef.current
            ? Math.max(1, Math.floor((Date.now() - generationStartRef.current) / 1000))
            : 0;
          const message = duration
            ? `魔法题库已完成！耗时 ${duration} 秒`
            : "魔法题库已完成！可以对应练习啦";
          showMerlin(message);
          setGlobalMerlinTip(message);
        })
        .catch(() => {
          showMerlin("好像除了点问题...请稍后再试");
          setGlobalMerlinTip("好像除了点问题...请稍后再试");
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : "文本提交失败";
      if (mountedRef.current) setUploadError(message);
      showMerlin("好像除了点问题...请稍后再试");
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels = {
      grammar: '语法题',
      reading: '阅读题',
      listening: '听力题',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getQuestionTypeColor = (type: string) => {
    const colors = {
      grammar: 'var(--emerald-green)',
      reading: 'var(--neon-gold)',
      listening: 'var(--mystical-purple)',
    };
    return colors[type as keyof typeof colors] || 'var(--foreground)';
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-6xl mx-auto">
      {/* 顶部导航 */}
      <motion.header 
        className="mb-6 lg:mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link 
              href="/"
              className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>
                  MagicPaaS
                </h1>
                <span className="px-3 py-1 text-xs rounded-full bg-[var(--mystical-purple)]/20 text-[var(--mystical-purple)] border border-[var(--mystical-purple)]/30">
                  魔法题库生成器
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                将普通题目转化为沉浸式魔法学习体验
              </p>
            </div>
          </div>

          <Link 
            href="/"
            className="px-4 py-2 glass-panel rounded-2xl text-sm hover:bg-white/10 transition-colors self-start lg:self-auto"
          >
            返回用户页
          </Link>
        </div>
      </motion.header>

      {/* 主内容区 - 固定高度防止页面无限延伸 */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 lg:h-[calc(100vh-180px)]">
        {/* 左侧 - 生成区 - 添加滚动容器 */}
        <motion.div 
          className="lg:overflow-y-auto lg:pr-2 lg:h-full flex flex-col"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col flex-1 gap-6 lg:min-h-full max-w-[760px] lg:mx-auto w-full">
            {/* 输入方式选择 */}
            <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col flex-1">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[var(--neon-gold)]" />
                生成魔法题库
              </h3>

              {/* 文本输入区 */}
              <div className="flex flex-col flex-1 min-h-0">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    if (event.shiftKey) return;
                    event.preventDefault();
                    handleGenerate();
                  }}
                  placeholder="例如：请生成 8 道语法题，考点是虚拟语气，难度 3，四选一，答案用 A/B/C/D。"
                  className="w-full flex-1 min-h-[140px] lg:min-h-[160px] px-4 py-3 glass-panel rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--neon-gold)]/50"
                />
                {uploadError ? (
                  <p className="text-xs text-[#FF6B4A] mt-3">{uploadError}</p>
                ) : null}
              </div>

              <div className="mt-6">
                <motion.button
                  onClick={handleGenerate}
                  disabled={isGenerating || !textInput.trim()}
                  className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-[var(--neon-gold)] to-[var(--emerald-green)] text-[var(--mystical-navy)] font-semibold text-base sm:text-lg flex items-center justify-center gap-3 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={!isGenerating && textInput.trim() ? { scale: 1.02 } : {}}
                  whileTap={!isGenerating && textInput.trim() ? { scale: 0.98 } : {}}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="relative z-10">
                        魔法生成中{elapsedSeconds ? `（已 ${elapsedSeconds} 秒）` : "..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span className="relative z-10">生成题目</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* 解析结果预览 - 仅在生成成功后显示 */}
            <AnimatePresence>
              {generatedQuestions.length > 0 && (
                <motion.div
                  className="glass-panel rounded-3xl p-5 sm:p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <Check className="w-5 h-5 text-[var(--emerald-green)]" />
                      生成成功
                    </h4>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      预览前 {Math.min(generatedQuestions.length, 3)} 条
                    </span>
                  </div>

                  <div className="space-y-4">
                    {generatedQuestions.slice(0, 3).map((q) => (
                      <motion.div
                        key={q.id}
                        className="glass-panel rounded-2xl p-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: q.id * 0.1 }}
                      >
                        {/* 题目类型标签 */}
                        <div className="flex items-center gap-2 mb-3">
                          <span 
                            className="px-3 py-1 text-xs rounded-full font-semibold"
                            style={{
                              background: `${getQuestionTypeColor(q.type)}20`,
                              color: getQuestionTypeColor(q.type),
                              border: `1px solid ${getQuestionTypeColor(q.type)}30`,
                            }}
                          >
                            {getQuestionTypeLabel(q.type)}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            #{q.id}
                          </span>
                        </div>

                        {/* 阅读材料（如果有） */}
                        {q.material && (
                          <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">
                              阅读材料：
                            </p>
                            <p className="text-sm text-[var(--foreground)]/80 line-clamp-2">
                              {q.material}
                            </p>
                          </div>
                        )}

                        {/* 题目 */}
                        <p className="text-sm font-medium mb-3">
                          {q.question}
                        </p>

                        {/* 选项 */}
                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((option, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 rounded-xl bg-white/5 text-xs flex items-center gap-2"
                              >
                                <span className="font-bold text-[var(--neon-gold)]">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 右侧 - 梅林助手 */}
        <div className="flex flex-col lg:h-full">
          <MerlinAssistant 
            showTip={showMerlinTip && Boolean(merlinMessage)}
            message={merlinMessage}
            onDismiss={() => setShowMerlinTip(false)}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
