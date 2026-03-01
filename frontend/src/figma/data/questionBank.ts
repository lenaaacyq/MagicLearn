import questionBank from "../../data/question-bank.json";

const optionLabels = ["A", "B", "C", "D", "E", "F", "G"];

type RawGroup = {
  id: string;
  type: "grammar" | "reading" | "listening";
  skill?: string;
  intro?: string;
  material?: {
    kind: string;
    text?: string;
    transcript?: string;
    audio?: {
      src?: string;
      duration?: number;
    };
    dialogue?: Array<{ role: string; text: string }>;
  } | null;
  questions: Array<{
    id: string;
    stem: string;
    options: string[];
    answer: string;
    analysis?: string;
    tags?: string[];
  }>;
};

type QuestionItem = {
  id: string;
  groupId: string;
  type: "grammar" | "reading" | "listening";
  skill?: string;
  material?: RawGroup["material"];
  intro?: string;
  stem: string;
  options: Array<{ id: string; text: string }>;
  answer: string;
  analysis?: string;
  tags?: string[];
};

const groups = (questionBank as { groups: RawGroup[] }).groups || [];

const normalizeOptions = (options: string[]) =>
  options.map((text, index) => ({
    id: optionLabels[index] || `${index + 1}`,
    text
  }));

export const getQuestionItems = (type: QuestionItem["type"]) => {
  const items: QuestionItem[] = [];
  groups
    .filter((group) => group.type === type)
    .forEach((group) => {
      group.questions.forEach((question) => {
        items.push({
          id: question.id,
          groupId: group.id,
          type: group.type,
          skill: group.skill,
          material: group.material ?? null,
          intro: group.intro,
          stem: question.stem,
          options: normalizeOptions(question.options),
          answer: question.answer,
          analysis: question.analysis,
          tags: question.tags
        });
      });
    });
  return items;
};
