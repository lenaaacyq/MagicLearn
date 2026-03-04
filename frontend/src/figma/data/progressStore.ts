import { markUserQuestionSeen } from "./questionBank";

export type QuestionType = "grammar" | "reading" | "listening";

type ProgressData = Record<QuestionType, string[]>;

const progressKey = "edupal-question-progress";

const emptyProgress = (): ProgressData => ({
  grammar: [],
  reading: [],
  listening: []
});

const readProgress = (): ProgressData => {
  if (typeof window === "undefined") {
    return emptyProgress();
  }
  try {
    const raw = window.localStorage.getItem(progressKey);
    if (!raw) {
      return emptyProgress();
    }
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    return {
      grammar: Array.isArray(parsed.grammar) ? parsed.grammar : [],
      reading: Array.isArray(parsed.reading) ? parsed.reading : [],
      listening: Array.isArray(parsed.listening) ? parsed.listening : []
    };
  } catch {
    return emptyProgress();
  }
};

const writeProgress = (data: ProgressData) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(progressKey, JSON.stringify(data));
};

export const markQuestionComplete = (type: QuestionType, questionId: string) => {
  const data = readProgress();
  const list = new Set(data[type]);
  list.add(questionId);
  const updated: ProgressData = {
    ...data,
    [type]: Array.from(list)
  };
  writeProgress(updated);
  markUserQuestionSeen(type, questionId);
  return updated;
};

export const getProgressPercent = (type: QuestionType, total: number) => {
  if (total <= 0) {
    return 0;
  }
  const data = readProgress();
  const done = Math.min(data[type].length, total);
  return Math.min(100, Math.round((done / total) * 100));
};
