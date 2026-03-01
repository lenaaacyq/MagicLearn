"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Tag,
  Upload
} from "lucide-react";

interface DataRow {
  id: number;
  originalText: string;
  knowledgePoints: string[];
  difficulty: number;
  isNew: boolean;
}

type ParsedRecord = {
  text?: string;
  focus?: string | string[];
  difficulty?: number | string;
};

export default function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [parsedData, setParsedData] = useState<DataRow[]>([]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/knowledge-base/upload-file", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "上传解析失败");
      }
      const data = await response.json();
      const rows: DataRow[] = (data.records || []).map((record: ParsedRecord, index: number) => {
        const focusValue = record.focus ?? "";
        const focusList = Array.isArray(focusValue)
          ? focusValue
          : String(focusValue)
              .split(/[,，、;；\n]/)
              .map((item) => item.trim())
              .filter(Boolean);
        const difficultyValue = Number(record.difficulty);
        return {
          id: index + 1,
          originalText: record.text || "",
          knowledgePoints: focusList.length ? focusList : ["未标注考点"],
          difficulty: Number.isFinite(difficultyValue) ? Math.min(5, Math.max(1, difficultyValue)) : 3,
          isNew: true
        };
      });
      setParsedData(rows);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "上传解析失败");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleGenerate = () => {
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);
    window.setTimeout(() => setIsGenerating(false), 2400);
  };

  const [originalExample] = useState(
    'Complete the sentence: "The old wizard ____ in the castle for many years."'
  );

  const [transformedExample] = useState(
    '🔮 古老魔法任务：解锁城堡秘密\n\n传说在迷雾缭绕的魔法城堡深处，一位睿智的老巫师守护着古老的魔法知识。请帮助揭开这个咒语的秘密：\n\n"The old wizard ____ in the castle for many years."\n\n💡 提示：注意时态的魔法规则，这位巫师已经在城堡中生活了很久很久...\n\n完成此任务，你将获得 50 魔法币和 "时态大师" 称号！'
  );

  return (
    <div className="min-h-screen px-4 pt-6 pb-6">
      <motion.header
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif)" }}>
                  MagicPaaS
                </h1>
                <span className="px-3 py-1 text-xs rounded-full bg-[var(--mystical-purple)]/20 text-[var(--mystical-purple)] border border-[var(--mystical-purple)]/30">
                  IP 叙事引擎
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                当前 IP：哈利波特魔法世界
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 glass-panel rounded-2xl text-sm hover:bg-white/10 transition-colors"
            >
              返回用户页
            </Link>
            <div className="px-4 py-2 glass-panel rounded-2xl text-sm">
              <span className="text-[var(--muted-foreground)]">环境：</span>
              <span className="ml-2 text-[var(--emerald-green)]">Production</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-panel rounded-3xl p-4">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--neon-gold)]" />
              上传题目
            </h3>

            <div className="mb-6">
              <div
                className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center hover:border-[var(--neon-gold)]/50 hover:bg-white/5 transition-all cursor-pointer"
                onClick={handleFileClick}
              >
                <Upload className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-sm font-semibold mb-1">
                  {isUploading ? "解析中..." : "拖拽或点击上传"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">支持 PDF / JPG / PNG 格式</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadError ? (
                <p className="text-xs text-[#FF6B4A] mt-3">{uploadError}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-[var(--emerald-green)]/10 border border-[var(--emerald-green)]/30">
              <div className="w-2 h-2 rounded-full bg-[var(--emerald-green)] animate-pulse" />
              <span className="text-sm text-[var(--emerald-green)]">
                已解析 {parsedData.length} 条数据
              </span>
            </div>
          </div>

          <div className="flex-1 glass-panel rounded-3xl p-5 overflow-hidden flex flex-col">
            <h4 className="text-sm font-semibold mb-4 text-[var(--muted-foreground)]">
              解析结果预览
            </h4>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--mystical-navy)] z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-[var(--muted-foreground)] font-semibold">
                      原始文本
                    </th>
                    <th className="text-left py-3 px-2 text-[var(--muted-foreground)] font-semibold">
                      提取考点
                    </th>
                    <th className="text-center py-3 px-2 text-[var(--muted-foreground)] font-semibold">
                      难度
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-2 text-xs max-w-[240px]">
                        <div className="relative">
                          {row.isNew ? (
                            <span className="absolute -top-2 -left-2 px-2 py-0.5 text-[10px] rounded-full bg-[var(--neon-gold)]/20 text-[var(--neon-gold)] border border-[var(--neon-gold)]/30">
                              新增
                            </span>
                          ) : null}
                          {row.originalText}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {row.knowledgePoints.map((point, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-lg bg-[var(--mystical-purple)]/20 text-[var(--mystical-purple)] border border-[var(--mystical-purple)]/30 flex items-center gap-1"
                            >
                              <Tag className="w-3 h-3" />
                              {point}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < row.difficulty
                                  ? "bg-[var(--neon-gold)]"
                                  : "bg-white/10"
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex-1 glass-panel rounded-3xl p-5 flex flex-col">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--neon-gold)]" />
              魔法改写对比
            </h4>

            <div className="flex-1 grid grid-rows-2 gap-4">
              <div className="glass-panel rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    原始题目
                  </span>
                  <span className="px-2 py-1 text-xs rounded-lg bg-white/5">
                    Standard
                  </span>
                </div>
                <div className="flex-1 text-sm leading-relaxed overflow-y-auto">
                  {originalExample}
                </div>
              </div>

              <div className="glass-panel-gold rounded-2xl p-4 flex flex-col relative overflow-hidden">
                <motion.div
                  className="absolute top-0 right-0 w-20 h-20 bg-[var(--neon-gold)] blur-3xl opacity-20"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity
                  }}
                />

                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-xs font-semibold text-[var(--neon-gold)]">
                    魔法渲染后
                  </span>
                  <span className="px-2 py-1 text-xs rounded-lg bg-[var(--neon-gold)]/20 text-[var(--neon-gold)] border border-[var(--neon-gold)]/30">
                    Magical ✨
                  </span>
                </div>
                <div className="flex-1 text-sm leading-relaxed overflow-y-auto relative z-10">
                  {transformedExample}
                </div>
              </div>
            </div>

            <motion.button
              className="mt-4 w-full py-4 rounded-2xl bg-[var(--neon-gold)] text-[var(--mystical-navy)] font-semibold text-lg flex items-center justify-center gap-3 relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
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
              {isGenerating ? (
                <motion.div
                  className="absolute inset-0 bg-[var(--neon-gold)]/15"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              ) : null}
              {isGenerating ? (
                <span className="relative z-10 flex items-center gap-2">
                  <motion.span
                    className="inline-flex"
                    animate={{ rotate: [0, 12, -12, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.span>
                  魔法世界构建中...
                </span>
              ) : (
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  生成 AI 多模态资产
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
