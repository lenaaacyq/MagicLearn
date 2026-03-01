import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, Sparkles, HelpCircle } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router';

interface QuestModalProps {
  questType: string;
  onClose: () => void;
}

interface WordChipProps {
  word: string;
  id: string;
}

const ItemType = 'WORD_CHIP';

function WordChip({ word, id }: WordChipProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType,
    item: { id, word },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <motion.div
      ref={drag}
      className={`px-6 py-3 rounded-2xl glass-panel-gold cursor-move select-none ${
        isDragging ? 'opacity-50' : ''
      }`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      style={{
        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)',
      }}
    >
      <span className="font-semibold text-[var(--neon-gold)]">{word}</span>
    </motion.div>
  );
}

interface DropZoneProps {
  index: number;
  onDrop: (word: string, index: number) => void;
  filledWord?: string;
}

function DropZone({ index, onDrop, filledWord }: DropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType,
    drop: (item: { id: string; word: string }) => onDrop(item.word, index),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`min-w-[120px] h-14 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
        isOver
          ? 'border-[var(--neon-gold)] bg-[var(--neon-gold)]/10 scale-105'
          : 'border-white/30 bg-white/5'
      }`}
    >
      {filledWord ? (
        <span className="font-semibold text-[var(--neon-gold)]">{filledWord}</span>
      ) : (
        <span className="text-xs text-[var(--muted-foreground)]">Drop here</span>
      )}
    </div>
  );
}

function QuestModalContent({ questType, onClose }: { questType: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const [filledSlots, setFilledSlots] = useState<{ [key: number]: string }>({});

  const availableWords = ['yesterday', 'tomorrow', 'ancient', 'received', 'magical'];

  const handleDrop = (word: string, index: number) => {
    setFilledSlots((prev) => ({ ...prev, [index]: word }));
  };

  const handleStartQuest = () => {
    // 根据任务类型跳转到对应的题目页
    const typeMap: { [key: string]: string } = {
      'howler': 'listening',
      'spell': 'grammar',
      'potion': 'reading',
    };
    const questionType = typeMap[questType] || 'grammar';
    navigate(`/question/${questionType}`);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* 模糊背景 */}
      <motion.div
        className="absolute inset-0 bg-[var(--mystical-navy)]/80"
        style={{ backdropFilter: 'blur(12px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* 主卡片 */}
      <motion.div
        className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 卷轴风格容器 */}
        <div className="glass-panel rounded-[40px] p-10 relative overflow-hidden">
          {/* 魔法粒子背景 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-[var(--neon-gold)] rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  y: [0, -50],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 标题 */}
          <div className="text-center mb-8 relative z-10">
            <motion.h2
              className="text-3xl mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
              animate={{
                textShadow: [
                  '0 0 10px rgba(255, 215, 0, 0.5)',
                  '0 0 20px rgba(255, 215, 0, 0.8)',
                  '0 0 10px rgba(255, 215, 0, 0.5)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              拦截吼叫信
            </motion.h2>
            <p className="text-[var(--muted-foreground)]">Intercept the Howler</p>
          </div>

          {/* 魔杖进度条 */}
          <div className="mb-10 relative z-10">
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--neon-gold)] to-[var(--emerald-green)] rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Sparkles className="w-full h-full text-white drop-shadow-lg" />
                </motion.div>
              </motion.div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--muted-foreground)]">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* 声波播放器 */}
          <div className="mb-10 relative z-10">
            <div className="glass-panel-gold rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-[var(--neon-gold)] flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-[var(--mystical-navy)]" />
                  ) : (
                    <Play className="w-5 h-5 text-[var(--mystical-navy)] ml-0.5" />
                  )}
                </button>
                
                <div className="flex-1 flex items-center gap-1 h-16">
                  {[...Array(40)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 bg-[var(--neon-gold)] rounded-full"
                      animate={{
                        height: isPlaying
                          ? [Math.random() * 40 + 20, Math.random() * 60 + 10, Math.random() * 40 + 20]
                          : 8,
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: isPlaying ? Infinity : 0,
                        delay: i * 0.02,
                      }}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-center text-[var(--muted-foreground)]">
                "I ____ a mysterious letter ____ that contained ____ symbols..."
              </p>
            </div>
          </div>

          {/* 填空槽位 */}
          <div className="mb-8 relative z-10">
            <h4 className="text-sm font-semibold mb-4 text-[var(--muted-foreground)]">
              Fill in the blanks:
            </h4>
            <div className="flex justify-center gap-4">
              <DropZone index={0} onDrop={handleDrop} filledWord={filledSlots[0]} />
              <DropZone index={1} onDrop={handleDrop} filledWord={filledSlots[1]} />
              <DropZone index={2} onDrop={handleDrop} filledWord={filledSlots[2]} />
            </div>
          </div>

          {/* 单词筹码托盘 */}
          <div className="mb-8 relative z-10">
            <h4 className="text-sm font-semibold mb-4 text-[var(--muted-foreground)]">
              Word Chips (Drag to fill):
            </h4>
            <div className="flex flex-wrap justify-center gap-3 p-6 rounded-3xl bg-white/5">
              {availableWords.map((word, idx) => (
                <WordChip key={idx} word={word} id={`word-${idx}`} />
              ))}
            </div>
          </div>

          {/* 开始任务按钮 */}
          <div className="relative z-10 flex justify-center mt-8">
            <motion.button
              onClick={handleStartQuest}
              className="px-10 py-4 rounded-3xl bg-gradient-to-r from-[var(--neon-gold)] to-[var(--emerald-green)] font-bold text-lg text-[var(--mystical-navy)] hover:scale-105 transition-transform"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <span>开始魔法试炼</span>
              </div>
            </motion.button>
          </div>

          {/* Agent PiP 悬浮窗 */}
          <motion.div
            className="absolute bottom-10 right-10 w-32 z-10"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <div className="relative">
              {/* 提示气泡 */}
              <motion.div
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 glass-panel rounded-2xl p-3 text-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-[var(--neon-gold)] flex-shrink-0 mt-0.5" />
                  <p>注意听信件里的时间状语！</p>
                </div>
                {/* 小三角 */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--card)] rotate-45" />
              </motion.div>

              {/* Agent 头像 */}
              <div className="w-24 h-24 rounded-full glass-panel-gold flex items-center justify-center relative border-2 border-[var(--neon-gold)]">
                <Sparkles className="w-10 h-10 text-[var(--neon-gold)]" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[var(--neon-gold)]"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function QuestModal({ questType, onClose }: QuestModalProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <AnimatePresence>
        <QuestModalContent questType={questType} onClose={onClose} />
      </AnimatePresence>
    </DndProvider>
  );
}