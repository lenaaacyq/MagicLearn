import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

interface ListeningQuestionProps {
  onComplete: () => void;
}

interface Option {
  id: string;
  text: string;
}

type PlayState = 'playing-first' | 'playing-second' | 'completed';

export default function ListeningQuestion({ onComplete }: ListeningQuestionProps) {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [playState, setPlayState] = useState<PlayState>('playing-first');
  const [activeSpeaker, setActiveSpeaker] = useState<'left' | 'right'>('left');
  const [showToast, setShowToast] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 题目数据
  const question = {
    leftCharacter: '🧙‍♂️',
    leftName: 'Harry',
    rightCharacter: '🧙‍♀️',
    rightName: 'Luna',
    dialogue: [
      { speaker: 'left', duration: 2000 },
      { speaker: 'right', duration: 2500 },
      { speaker: 'left', duration: 1500 },
    ],
    questionText: 'What did Luna suggest they should do?',
    options: [
      { id: 'A', text: 'Visit the library' },
      { id: 'B', text: 'Practice defensive spells' },
      { id: 'C', text: 'Feed the Thestrals' },
      { id: 'D', text: 'Go to Hogsmeade' },
    ],
    correctAnswer: 'C',
  };

  // 模拟音频播放
  useEffect(() => {
    let currentDialogueIndex = 0;
    let currentPlay = 1;

    const playDialogue = () => {
      if (currentDialogueIndex < question.dialogue.length) {
        const dialogue = question.dialogue[currentDialogueIndex];
        setActiveSpeaker(dialogue.speaker);

        setTimeout(() => {
          currentDialogueIndex++;
          playDialogue();
        }, dialogue.duration);
      } else {
        // 一遍播放完成
        if (currentPlay === 1) {
          // 显示提示
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          
          // 准备第二遍
          setTimeout(() => {
            setPlayState('playing-second');
            currentDialogueIndex = 0;
            currentPlay = 2;
            playDialogue();
          }, 2500);
        } else {
          // 两遍播放完成
          setPlayState('completed');
          setActiveSpeaker('left'); // 重置
          
          // 显示题干（打字机效果）
          setTimeout(() => {
            setIsTyping(true);
            const fullText = question.questionText;
            let index = 0;
            
            const timer = setInterval(() => {
              if (index <= fullText.length) {
                setDisplayText(fullText.slice(0, index));
                index++;
              } else {
                setIsTyping(false);
                clearInterval(timer);
              }
            }, 40);
          }, 500);
        }
      }
    };

    playDialogue();
  }, []);

  const handleOptionClick = (optionId: string) => {
    if (isAnswered) return;
    
    setSelectedOption(optionId);
    setIsAnswered(true);
  };

  const handleClose = () => {
    navigate('/');
  };

  const isPlaying = playState !== 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景场景图 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1611074182055-4ac85bad8bb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWdpY2FsJTIwY2xhc3Nyb29tJTIwaW50ZXJpb3IlMjBwdXJwbGV8ZW58MXx8fHwxNzcyMjkyNzUyfDA&ixlib=rb-4.1.0&q=80&w=1080')`,
        }}
      >
        {/* 深色遮罩 */}
        <div className="absolute inset-0 bg-[var(--mystical-navy)]/85" />
      </div>

      {/* 魔法符文背景动画 - 声音发生时增强 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(isPlaying ? 25 : 10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[var(--mystical-purple)] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0, 2, 0],
            }}
            transition={{
              duration: 1.5 + Math.random() * 1,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
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

      {/* Toast 提示 */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 glass-panel-gold rounded-2xl"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-[var(--neon-gold)] font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              再听一次，保持专注！
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* 左侧角色 */}
        <motion.div
          className="absolute left-20 top-1/2 -translate-y-1/2"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            {/* 角色背景光晕 - 说话时高亮 */}
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: 'var(--neon-gold)' }}
              animate={{
                scale: activeSpeaker === 'left' && isPlaying ? [1, 1.3, 1] : 1,
                opacity: activeSpeaker === 'left' && isPlaying ? [0.4, 0.7, 0.4] : 0.2,
              }}
              transition={{
                duration: 1,
                repeat: activeSpeaker === 'left' && isPlaying ? Infinity : 0,
              }}
            />
            
            {/* 角色容器 */}
            <motion.div
              className="relative w-40 h-40 glass-panel rounded-3xl flex items-center justify-center text-[100px]"
              animate={{
                scale: activeSpeaker === 'left' && isPlaying ? 1.05 : 1,
                opacity: activeSpeaker === 'left' && isPlaying ? 1 : 0.6,
              }}
              transition={{ duration: 0.3 }}
            >
              {question.leftCharacter}
            </motion.div>

            {/* 名牌 */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--neon-gold)] text-[var(--mystical-navy)] rounded-full text-sm font-semibold whitespace-nowrap">
              {question.leftName}
            </div>

            {/* 声波气泡 - 说话时显示 */}
            <AnimatePresence>
              {activeSpeaker === 'left' && isPlaying && (
                <motion.div
                  className="absolute -right-16 top-8 w-32 h-24 glass-panel rounded-3xl flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {/* 声波动画 */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-[var(--neon-gold)] rounded-full"
                        animate={{
                          height: ['20px', '40px', '20px'],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 右侧角色 */}
        <motion.div
          className="absolute right-20 top-1/2 -translate-y-1/2"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            {/* 角色背景光晕 - 说话时高亮 */}
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: 'var(--mystical-purple)' }}
              animate={{
                scale: activeSpeaker === 'right' && isPlaying ? [1, 1.3, 1] : 1,
                opacity: activeSpeaker === 'right' && isPlaying ? [0.4, 0.7, 0.4] : 0.2,
              }}
              transition={{
                duration: 1,
                repeat: activeSpeaker === 'right' && isPlaying ? Infinity : 0,
              }}
            />
            
            {/* 角色容器 */}
            <motion.div
              className="relative w-40 h-40 glass-panel rounded-3xl flex items-center justify-center text-[100px]"
              animate={{
                scale: activeSpeaker === 'right' && isPlaying ? 1.05 : 1,
                opacity: activeSpeaker === 'right' && isPlaying ? 1 : 0.6,
              }}
              transition={{ duration: 0.3 }}
            >
              {question.rightCharacter}
            </motion.div>

            {/* 名牌 */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--mystical-purple)] rounded-full text-sm font-semibold whitespace-nowrap">
              {question.rightName}
            </div>

            {/* 声波气泡 - 说话时显示 */}
            <AnimatePresence>
              {activeSpeaker === 'right' && isPlaying && (
                <motion.div
                  className="absolute -left-16 top-8 w-32 h-24 glass-panel rounded-3xl flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {/* 声波动画 */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-[var(--mystical-purple)] rounded-full"
                        animate={{
                          height: ['20px', '40px', '20px'],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 题干和选项区 - 播放完成后显示 */}
        <AnimatePresence>
          {playState === 'completed' && displayText && (
            <motion.div
              className="flex-1 flex items-center justify-center px-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-full max-w-3xl">
                {/* 题目文字 */}
                <motion.div
                  className="mb-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                    {displayText}
                    {isTyping && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        |
                      </motion.span>
                    )}
                  </h3>
                </motion.div>

                {/* 选项列表 */}
                {!isTyping && (
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
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
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
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 播放状态指示器 */}
        {isPlaying && (
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 glass-panel rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="flex gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-[var(--mystical-purple)] rounded-full" />
                ))}
              </motion.div>
              <span className="text-sm text-[var(--muted-foreground)]">
                {playState === 'playing-first' ? 'Listening... (1/2)' : 'Listening... (2/2)'}
              </span>
            </div>
          </motion.div>
        )}
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
