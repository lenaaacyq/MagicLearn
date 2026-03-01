import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router';

interface ReadingQuestionProps {
  onComplete: () => void;
}

interface Option {
  id: string;
  text: string;
}

export default function ReadingQuestion({ onComplete }: ReadingQuestionProps) {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isScrollExpanded, setIsScrollExpanded] = useState(false);

  // 题目数据
  const question = {
    character: 'Hermione',
    characterEmoji: '📚',
    dialogue: '"I found this passage in the library. Read carefully and answer..."',
    passage: `The Room of Requirement, also known as the Come and Go Room, is a secret room within Hogwarts Castle. It appears only when a person is in great need of it. The room has the ability to transform itself into whatever the seeker requires at that moment. For example, if someone needs a place to hide something, the room will become a vast storage space filled with forgotten objects.`,
    question: 'According to the passage, when does the Room of Requirement appear?',
    options: [
      { id: 'A', text: 'Every full moon' },
      { id: 'B', text: 'When someone needs it greatly' },
      { id: 'C', text: 'Only for teachers' },
      { id: 'D', text: 'During magical ceremonies' },
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
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景场景图 - 图书馆 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1763368230669-3a2e97368032?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwbGlicmFyeSUyMHJlYWRpbmclMjByb29tJTIwZGFya3xlbnwxfHx8fDE3NzIyOTI3NTN8MA&ixlib=rb-4.1.0&q=80&w=1080')`,
        }}
      >
        {/* 深色遮罩增强可读性 */}
        <div className="absolute inset-0 bg-[var(--mystical-navy)]/85" />
      </div>

      {/* 书页飘落动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-10}%`,
            }}
            animate={{
              y: ['0vh', '110vh'],
              rotate: [0, 360],
              opacity: [0.1, 0.2, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
          >
            📖
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
              style={{ background: 'var(--neon-gold)' }}
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
            <div className="absolute -top-3 -right-3 px-3 py-1 bg-[var(--neon-gold)] text-[var(--mystical-navy)] rounded-full text-xs font-semibold">
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
              <div className="w-full max-w-4xl">
                {/* 卷轴 - 阅读材料 */}
                <motion.div
                  className="mb-8 relative"
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    onClick={() => setIsScrollExpanded(!isScrollExpanded)}
                    className="w-full glass-panel-gold rounded-3xl p-6 text-left hover:bg-[var(--neon-gold)]/10 transition-all cursor-pointer border-2 border-[var(--neon-gold)]/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-[var(--neon-gold)]" />
                        <h4 className="text-lg font-semibold text-[var(--neon-gold)]">
                          Ancient Scroll
                        </h4>
                      </div>
                      <motion.span
                        className="text-[var(--neon-gold)]"
                        animate={{ rotate: isScrollExpanded ? 180 : 0 }}
                      >
                        ▼
                      </motion.span>
                    </div>
                    
                    <AnimatePresence>
                      {isScrollExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="mt-4 pt-4 border-t border-[var(--neon-gold)]/30">
                            <p className="text-base leading-relaxed text-[var(--foreground)]/90" style={{ fontFamily: 'var(--font-serif)' }}>
                              {question.passage}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* 魔法光点围绕卷轴 */}
                  {isScrollExpanded && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-[var(--neon-gold)] rounded-full"
                          style={{
                            left: '50%',
                            top: '50%',
                          }}
                          animate={{
                            x: [0, Math.cos(i * 60 * Math.PI / 180) * 150],
                            y: [0, Math.sin(i * 60 * Math.PI / 180) * 100],
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* 题目文字 */}
                <motion.div
                  className="mb-6 text-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-xl text-[var(--foreground)]/90 leading-relaxed font-medium">
                    {question.question}
                  </p>
                </motion.div>

                {/* 选项列表 */}
                <div className="grid grid-cols-1 gap-3">
                  {question.options.map((option, index) => {
                    const isSelected = selectedOption === option.id;
                    const isCorrect = option.id === question.correctAnswer;
                    const showResult = isAnswered;

                    return (
                      <motion.button
                        key={option.id}
                        className={`
                          relative p-5 rounded-2xl text-left transition-all duration-300
                          ${!showResult && 'glass-panel hover:bg-white/10 cursor-pointer'}
                          ${showResult && isSelected && isCorrect && 'bg-[var(--emerald-green)]/30 border-2 border-[var(--emerald-green)]'}
                          ${showResult && isSelected && !isCorrect && 'bg-red-500/30 border-2 border-red-500'}
                          ${showResult && !isSelected && isCorrect && 'bg-[var(--emerald-green)]/20 border border-[var(--emerald-green)]'}
                          ${showResult && !isSelected && !isCorrect && 'opacity-50'}
                        `}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.08 }}
                        onClick={() => handleOptionClick(option.id)}
                        disabled={isAnswered}
                        whileHover={!isAnswered ? { x: 8 } : {}}
                      >
                        {/* 选项标签 */}
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-9 h-9 rounded-xl flex items-center justify-center font-bold
                            ${!showResult && 'bg-white/10'}
                            ${showResult && isSelected && isCorrect && 'bg-[var(--emerald-green)]'}
                            ${showResult && isSelected && !isCorrect && 'bg-red-500'}
                            ${showResult && !isSelected && isCorrect && 'bg-[var(--emerald-green)]/50'}
                          `}>
                            {option.id}
                          </div>
                          <span className="text-base font-medium">{option.text}</span>
                        </div>

                        {/* 正确答案标记 */}
                        {showResult && isCorrect && (
                          <motion.div
                            className="absolute top-4 right-4"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                          >
                            <Sparkles className="w-5 h-5 text-[var(--emerald-green)]" />
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

        {/* 对话区 - 底部字幕式 */}
        <motion.div
          className="relative z-20 px-12 pb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="glass-panel rounded-3xl p-6 border-2 border-[var(--neon-gold)]/30">
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
