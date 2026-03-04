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
  isNew?: boolean;
  createdAt?: number;
};

const rawGroups = (questionBank as { groups: RawGroup[] }).groups || [];

const hpReplacements: Array<[RegExp, string]> = [
  [/Arcane Academy/gi, "Hogwarts"],
  [/Magic Academy/gi, "Hogwarts"],
  [/Magic Classroom/gi, "Hogwarts Classroom"],
  [/Headmaster/gi, "Professor Dumbledore"],
  [/Potion Shop/gi, "Potions Classroom"],
  [/Skybridge Castle/gi, "Hogwarts Castle"],
  [/Spell Market/gi, "Diagon Alley"],
  [/Wanda Cinema/gi, "Hogsmeade Cinema"],
  [/Lily/gi, "Hermione"],
  [/Cathy/gi, "Ginny"],
  [/Lisa/gi, "Luna"]
];

const rewriteHpText = (value?: string) => {
  if (!value) return value;
  return hpReplacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), value);
};

const rewriteDialogue = (dialogue?: Array<{ role: string; text: string }>) => {
  if (!dialogue) return dialogue;
  return dialogue.map((entry) => ({ ...entry, text: rewriteHpText(entry.text) || entry.text }));
};

const rewriteGroup = (group: RawGroup): RawGroup => {
  if (group.type === "listening") {
    return group;
  }
  const material = group.material
    ? {
        ...group.material,
        text: rewriteHpText(group.material.text),
        transcript: rewriteHpText(group.material.transcript),
        dialogue: rewriteDialogue(group.material.dialogue)
      }
    : group.material;
  return {
    ...group,
    skill: rewriteHpText(group.skill),
    intro: rewriteHpText(group.intro),
    material,
    questions: group.questions.map((question) => ({
      ...question,
      stem: rewriteHpText(question.stem) || question.stem,
      options: question.options.map((option) => rewriteHpText(option) || option),
      answer: rewriteHpText(question.answer) || question.answer,
      analysis: rewriteHpText(question.analysis),
      tags: question.tags?.map((tag) => rewriteHpText(tag) || tag)
    }))
  };
};

const groups = rawGroups.map(rewriteGroup);

const normalizeOptions = (options: string[]) =>
  options.map((text, index) => ({
    id: optionLabels[index] || `${index + 1}`,
    text
  }));

const userKey = "magic_user_question_items_v1";
const progressKey = "edupal-question-progress";
const listeningCleanupKey = "magic_user_listening_cleanup_v1";

let cleanupBound = false;

const bindSessionCleanup = () => {
  if (typeof window === "undefined") return;
  if (cleanupBound) return;
  cleanupBound = true;
  const clear = () => {
    try {
      window.sessionStorage.removeItem(userKey);
    } catch {}
    try {
      window.localStorage.removeItem(progressKey);
    } catch {}
  };
  window.addEventListener("beforeunload", clear);
  window.addEventListener("pagehide", clear);
};

bindSessionCleanup();

type UserPayload = Record<QuestionItem["type"], QuestionItem[]>;

let legacyUserPayloadCleared = false;

const sanitizeStem = (value: string) =>
  String(value || "")
    .replace(/^(\(\d+\)|\d+[.)])\s*/gm, "")
    .trim();

const loadUserPayload = (): UserPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    if (!legacyUserPayloadCleared) {
      legacyUserPayloadCleared = true;
      try {
        window.localStorage.removeItem(userKey);
      } catch {}
      try {
        const rawLegacy = window.localStorage.getItem(userKey);
        if (rawLegacy) {
          const parsed = JSON.parse(rawLegacy) as Partial<UserPayload>;
          const legacyItems = [
            ...(Array.isArray(parsed.grammar) ? parsed.grammar : []),
            ...(Array.isArray(parsed.reading) ? parsed.reading : []),
            ...(Array.isArray(parsed.listening) ? parsed.listening : [])
          ];
          if (
            legacyItems.some((item) =>
              /[\u4e00-\u9fff]/.test(`${item?.stem || ""}${item?.material?.text || ""}${item?.material?.transcript || ""}`)
            )
          ) {
            window.localStorage.removeItem(userKey);
          }
        }
      } catch {}
    }
    const raw = window.sessionStorage.getItem(userKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const listeningCleared = window.sessionStorage.getItem(listeningCleanupKey) === "done";
    const listeningItems = Array.isArray(parsed.listening) ? parsed.listening : [];
    const cleanedPayload = {
      grammar: Array.isArray(parsed.grammar) ? parsed.grammar : [],
      reading: Array.isArray(parsed.reading) ? parsed.reading : [],
      listening: listeningCleared ? listeningItems : []
    };
    if (!listeningCleared) {
      try {
        window.sessionStorage.setItem(listeningCleanupKey, "done");
        window.sessionStorage.setItem(userKey, JSON.stringify(cleanedPayload));
      } catch {}
    }
    return cleanedPayload;
  } catch {
    return null;
  }
};

const saveUserPayload = (payload: UserPayload) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(userKey, JSON.stringify(payload));
  window.dispatchEvent(new Event("magic-user-question-updated"));
};

export const saveUserQuestionItems = (items: QuestionItem[]) => {
  const payload =
    loadUserPayload() ?? { grammar: [], reading: [], listening: [] };
  const now = Date.now();
  const next = { ...payload };
  items.forEach((item) => {
    const createdAt = item.createdAt ?? now;
    const tags = (item.tags || []).filter((tag) => tag !== "new");
    const isNew = item.isNew ?? true;
    next[item.type] = [
      { ...item, stem: sanitizeStem(item.stem), tags, isNew, createdAt },
      ...next[item.type]
    ]
      .slice(0, 100);
  });
  saveUserPayload(next);
};

export const markUserQuestionSeen = (type: QuestionItem["type"], questionId: string) => {
  const payload = loadUserPayload();
  if (!payload) return;
  const list = payload[type] ?? [];
  const nextList = list.map((item) => {
    if (item.id !== questionId) return item;
    const tags = (item.tags || []).filter((tag) => tag !== "new");
    return { ...item, isNew: false, tags };
  });
  saveUserPayload({ ...payload, [type]: nextList });
};

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
          stem: sanitizeStem(question.stem),
          options: normalizeOptions(question.options),
          answer: question.answer,
          analysis: question.analysis,
          tags: question.tags
        });
      });
    });
  const payload = loadUserPayload();
  const userItems = payload?.[type] ?? [];
  const sortedUserItems = [...userItems].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
  const normalizedUserItems = sortedUserItems.map((item) => ({
    ...item,
    stem: sanitizeStem(item.stem)
  }));
  return [...normalizedUserItems, ...items];
};
