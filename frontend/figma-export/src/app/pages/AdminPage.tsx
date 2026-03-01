import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { 
  Upload, 
  ArrowLeft, 
  Sparkles, 
  Tag, 
  BarChart3,
  Wand2,
  Smile,
  BookOpen
} from 'lucide-react';

interface DataRow {
  id: number;
  originalText: string;
  knowledgePoints: string[];
  difficulty: number;
}

export default function AdminPage() {
  const [agentPersona, setAgentPersona] = useState('幽默同伴');
  const [humorLevel, setHumorLevel] = useState(70);
  const [strictnessLevel, setStrictnessLevel] = useState(30);
  
  const [parsedData] = useState<DataRow[]>([
    {
      id: 1,
      originalText: 'The cat sat on the mat.',
      knowledgePoints: ['过去时态', '介词短语', '冠词用法'],
      difficulty: 2,
    },
    {
      id: 2,
      originalText: 'She has been studying English for three years.',
      knowledgePoints: ['现在完成进行时', '时间状语', '高频词'],
      difficulty: 4,
    },
    {
      id: 3,
      originalText: 'If I had known, I would have helped you.',
      knowledgePoints: ['虚拟语气', '过去完成时', '条件句'],
      difficulty: 5,
    },
  ]);

  const [originalExample] = useState(
    'Complete the sentence: "The old wizard ____ in the castle for many years."'
  );
  
  const [transformedExample] = useState(
    '🔮 古老魔法任务：解锁城堡秘密\n\n传说在迷雾缭绕的魔法城堡深处，一位睿智的老巫师守护着古老的魔法知识。请帮助揭开这个咒语的秘密：\n\n"The old wizard ____ in the castle for many years."\n\n💡 提示：注意时态的魔法规则，这位巫师已经在城堡中生活了很久很久...\n\n完成此任务，你将获得 50 魔法币和 "时态大师" 称号！'
  );

  return (
    <div className="min-h-screen p-8">
      {/* 顶部导航 */}
      <motion.header 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
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
              to="/" 
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

      {/* 主内容区 - 左右双栏 */}
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-180px)]">
        {/* 左侧 - 知识图谱解析区 */}
        <motion.div 
          className="flex flex-col gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--neon-gold)]" />
              知识图谱解析
            </h3>

            {/* 上传区 */}
            <div className="mb-6">
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-[var(--neon-gold)]/50 hover:bg-white/5 transition-all cursor-pointer">
                <Upload className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-sm font-semibold mb-1">拖拽或点击上传</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  支持 CSV / PDF / TXT 格式
                </p>
              </div>
            </div>

            {/* 解析状态 */}
            <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-[var(--emerald-green)]/10 border border-[var(--emerald-green)]/30">
              <div className="w-2 h-2 rounded-full bg-[var(--emerald-green)] animate-pulse" />
              <span className="text-sm text-[var(--emerald-green)]">
                已解析 3 条数据
              </span>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="flex-1 glass-panel rounded-3xl p-6 overflow-hidden flex flex-col">
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
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 text-xs max-w-[200px]">
                        {row.originalText}
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
                                  ? 'bg-[var(--neon-gold)]'
                                  : 'bg-white/10'
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

        {/* 右侧 - 叙事引擎配置 */}
        <motion.div 
          className="flex flex-col gap-4"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* 配置表单 */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[var(--mystical-purple)]" />
              叙事引擎配置
            </h3>

            {/* Agent 设定 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">
                Agent 人设
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['严厉导师', '幽默同伴', '神秘向导'].map((persona) => (
                  <button
                    key={persona}
                    onClick={() => setAgentPersona(persona)}
                    className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      agentPersona === persona
                        ? 'bg-[var(--neon-gold)] text-[var(--mystical-navy)] glow-gold'
                        : 'glass-panel hover:bg-white/10'
                    }`}
                  >
                    {persona}
                  </button>
                ))}
              </div>
            </div>

            {/* 语气滑块 */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Smile className="w-4 h-4 text-[var(--emerald-green)]" />
                    幽默度
                  </label>
                  <span className="text-sm text-[var(--neon-gold)]">{humorLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={humorLevel}
                  onChange={(e) => setHumorLevel(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--emerald-green) 0%, var(--emerald-green) ${humorLevel}%, rgba(255,255,255,0.1) ${humorLevel}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#FF6B4A]" />
                    严格度
                  </label>
                  <span className="text-sm text-[var(--neon-gold)]">{strictnessLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={strictnessLevel}
                  onChange={(e) => setStrictnessLevel(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B4A 0%, #FF6B4A ${strictnessLevel}%, rgba(255,255,255,0.1) ${strictnessLevel}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 魔法改写对比 */}
          <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--neon-gold)]" />
              魔法改写对比
            </h4>

            <div className="flex-1 grid grid-rows-2 gap-4">
              {/* 原始题目 */}
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

              {/* IP 渲染后 */}
              <div className="glass-panel-gold rounded-2xl p-4 flex flex-col relative overflow-hidden">
                {/* 闪烁效果 */}
                <motion.div
                  className="absolute top-0 right-0 w-20 h-20 bg-[var(--neon-gold)] blur-3xl opacity-20"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 0.4, 0.2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                />

                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-xs font-semibold text-[var(--neon-gold)]">
                    IP 魔法渲染后
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

            {/* 生成按钮 */}
            <motion.button
              className="mt-6 w-full py-4 rounded-2xl bg-[var(--neon-gold)] text-[var(--mystical-navy)] font-semibold text-lg flex items-center justify-center gap-3 relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <Sparkles className="w-5 h-5" />
              <span className="relative z-10">生成 AI 多模态资产</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}