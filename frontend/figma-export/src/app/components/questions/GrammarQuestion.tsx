import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

interface GrammarQuestionProps {
  onComplete: () => void;
}

interface Option {
  id: string;
  text: string;
}

export default function GrammarQuestion({ onComplete }: GrammarQuestionProps) {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // 题目数据
  const question = {
    character: 'Merlin',
    characterEmoji: '🧙‍♂️',
    dialogue: '"Young wizard, complete this ancient incantation correctly..."',
    question: 'If I _____ a time-turner, I would visit the founding of Hogwarts.',
    options: [
      { id: 'A', text: 'have' },
      { id: 'B', text: 'had' },
      { id: 'C', text: 'has' },
      { id: 'D', text: 'having' },
    ],
    correctAnswer: 'B',
  };

  // 打字机效果
  useEffect(() => {
    const fullText = question.dialogue;
    let index = 0;
    
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  const handleOptionClick = (optionId: string) => {
    if (isAnswered) return;
    
    setSelectedOption(optionId);
    setIsAnswered(true);

    // 2秒后可以继续
    setTimeout(() => {
      // 这里可以跳转到下一题或返回
    }, 2000);
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景场景图 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1611074182055-4ac85bad8bb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWdpY2FsJTIwY2xhc3Nyb29tJTIwaW50ZXJpb3IlMjBwdXJwbGV8ZW58MXx8fHwxNzcyMjkyNzUyfDA&ixlib=rb-4.1.0&q=80&w=1080')`,
        }}
      >
        {/* 深色遮罩增强可读性 */}
        <div className="absolute inset-0 bg-[var(--mystical-navy)]/80" />
      </div>

      {/* 魔法符文背景动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.05, 0.15, 0.05],
              rotate: [0, 360],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          >
            {['✨', '⭐', '🌟', '✦', '◆'][Math.floor(Math.random() * 5)]}
          </motion.div>
        ))}
      </div>

      {/* 关闭按钮 */}
      <motion.button
        className="absolute top-8 right-8 z-50 w-12 h-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleClose}
      >
        <X className="w-6 h-6" />
      </motion.button>

      {/* 主内容区 */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* 角色区 - 左下角 */}
        <motion.div
          className="absolute left-12 bottom-32 flex items-end gap-4"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 角色立绘容器 */}
          <div className="relative">
            {/* 角色背景光晕 */}
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: 'var(--mystical-purple)' }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            />
            
            {/* 角色emoji */}
            <div className="relative w-32 h-32 glass-panel rounded-3xl flex items-center justify-center text-[80px]">
              {question.characterEmoji}
            </div>

            {/* 角色名牌 */}
            <div className="absolute -top-3 -right-3 px-3 py-1 bg-[var(--mystical-purple)] rounded-full text-xs font-semibold">
              {question.character}
            </div>
          </div>
        </motion.div>

        {/* 选项区 - 屏幕正中 */}
        <AnimatePresence>
          {!isTyping && (
            <motion.div
              className="flex-1 flex items-center justify-center px-20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* 选项容器 */}
              <div className="w-full max-w-3xl">
                {/* 题目文字 */}
                <motion.div
                  className="mb-8 text-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                    Complete the Spell
                  </h3>
                  <p className="text-xl text-[var(--foreground)]/90 leading-relaxed">
                    {question.question}
                  </p>
                </motion.div>

                {/* 选项列表 */}
                <div className="grid grid-cols-2 gap-4">
                  {question.options.map((option, index) => {
                    const isSelected = selectedOption === option.id;
                    const isCorrect = option.id === question.correctAnswer;
                    const showResult = isAnswered;

                    return (
                      <motion.button
                        key={option.id}
                        className={`
                          relative p-6 rounded-3xl text-left transition-all duration-300
                          ${!showResult && 'glass-panel hover:bg-white/10 cursor-pointer'}
                          ${showResult && isSelected && isCorrect && 'bg-[var(--emerald-green)]/30 border-2 border-[var(--emerald-green)]'}
                          ${showResult && isSelected && !isCorrect && 'bg-red-500/30 border-2 border-red-500'}
                          ${showResult && !isSelected && isCorrect && 'bg-[var(--emerald-green)]/20 border border-[var(--emerald-green)]'}
                          ${showResult && !isSelected && !isCorrect && 'opacity-50'}
                        `}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        onClick={() => handleOptionClick(option.id)}
                        disabled={isAnswered}
                        whileHover={!isAnswered ? { scale: 1.03, y: -4 } : {}}
                      >
                        {/* 选项标签 */}
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                            ${!showResult && 'bg-white/10'}
                            ${showResult && isSelected && isCorrect && 'bg-[var(--emerald-green)]'}
                            ${showResult && isSelected && !isCorrect && 'bg-red-500'}
                            ${showResult && !isSelected && isCorrect && 'bg-[var(--emerald-green)]/50'}
                          `}>
                            {option.id}
                          </div>
                          <span className="text-lg font-medium">{option.text}</span>
                        </div>

                        {/* 正确答案标记 */}
                        {showResult && isCorrect && (
                          <motion.div
                            className="absolute top-4 right-4"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                          >
                            <Sparkles className="w-6 h-6 text-[var(--emerald-green)]" />
                          </motion.div>
                        )}

                        {/* 悬浮发光效果 */}
                        {!showResult && (
                          <motion.div
                            className="absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                            style={{
                              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(255, 215, 0, 0.1))',
                            }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 对话区 - 底部字幕式 */}
        <motion.div
          className="relative z-20 px-12 pb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="glass-panel rounded-3xl p-6 border-2 border-[var(--glass-border-purple)]">
            <p className="text-lg leading-relaxed" style={{ fontFamily: 'var(--font-serif)' }}>
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
          </div>
        </motion.div>
      </div>

      {/* 选中时的全屏遮罩效果 */}
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
