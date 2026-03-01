const modelCatalog = [
  {
    id: "qwen-plus",
    vendor: "阿里通义千问",
    region: "CN",
    type: "text",
    description: "中文体验优秀，成本友好",
  },
  {
    id: "glm-4",
    vendor: "智谱GLM",
    region: "CN",
    type: "text",
    description: "对话与推理均衡",
  },
  {
    id: "ernie-4.0",
    vendor: "百度文心",
    region: "CN",
    type: "text",
    description: "中文场景覆盖广",
  },
  {
    id: "spark-4.0",
    vendor: "讯飞星火",
    region: "CN",
    type: "text",
    description: "教育与语音生态友好",
  },
  {
    id: "gpt-4o-mini",
    vendor: "OpenAI",
    region: "US",
    type: "text",
    description: "国际备选",
  },
];

const personaLibrary = {
  hogwarts: {
    label: "魔法学院导师",
    style: "沉稳、鼓励、带一点神秘",
  },
  idol: {
    label: "爱豆搭档",
    style: "温柔、热情、轻松陪伴",
  },
  detective: {
    label: "谜案侦探",
    style: "逻辑清晰、耐心引导",
  },
};

const levelWordBank = {
  beginner: ["spell", "magic", "friend", "school", "mystery"],
  intermediate: ["whisper", "courage", "journey", "mission", "guardian"],
  advanced: ["enigma", "resilience", "alliance", "labyrinth", "transcend"],
};

const defaultMemory = {
  hardWords: {},
  lastEmotion: "calm",
  lastWord: "",
  completedMissions: [],
};

const memoryKey = "edupal-memory";

export function getModelCatalog() {
  return modelCatalog;
}

export function getPreferredModel(models = modelCatalog) {
  return models.find((model) => model.region === "CN") || models[0];
}

export function getPersonas() {
  return personaLibrary;
}

export function buildPlan(level = "beginner") {
  const words = levelWordBank[level] || levelWordBank.beginner;
  return words.map((word, index) => ({
    id: `${level}-${word}`,
    title: `寻找秘宝 ${index + 1}`,
    goal: `掌握单词 "${word}" 的发音与用法`,
    word,
  }));
}

export function loadMemory() {
  try {
    const raw = localStorage.getItem(memoryKey);
    if (!raw) {
      return { ...defaultMemory };
    }
    const parsed = JSON.parse(raw);
    return { ...defaultMemory, ...parsed };
  } catch {
    return { ...defaultMemory };
  }
}

export function saveMemory(memory) {
  try {
    const payload = JSON.stringify(memory);
    localStorage.setItem(memoryKey, payload);
  } catch (error) {
    console.warn("[memory] save failed:", error);
  }
}

export function updateMemory(memory, { word, emotion, result }) {
  const next = { ...memory };
  if (word) {
    const count = next.hardWords[word] || 0;
    next.hardWords[word] = result === "struggle" ? count + 1 : count;
    next.lastWord = word;
    if (result === "success") {
      next.completedMissions = Array.from(
        new Set([...next.completedMissions, word])
      );
    }
  }
  if (emotion) {
    next.lastEmotion = emotion;
  }
  return next;
}

export function generateResponse({
  persona,
  name,
  word,
  emotion,
  result,
  memory,
}) {
  const personaProfile = personaLibrary[persona] || personaLibrary.hogwarts;
  const recall = memory.hardWords[word] > 0;
  const moodMap = {
    nervous: "我能感觉到你有点紧张，我们放慢一点。",
    excited: "你的兴奋很棒，能量满格！",
    calm: "状态很稳，继续保持。",
  };
  const resultMap = {
    success: "这次发音很清晰，我们继续下一关。",
    struggle: "没关系，困难是解谜的一部分，我们一起拆开它。",
  };
  const recallLine = recall
    ? `还记得上次我们在密林里遇到 "${word}" 吗？这次一定能读对。`
    : `今天的关键咒语是 "${word}"。`;
  return `${name || "搭档"}，我以${personaProfile.label}的方式陪你。${
    moodMap[emotion] || moodMap.calm
  } ${recallLine} ${resultMap[result] || ""}`.trim();
}

export function getProgress(plan, memory) {
  const completed = memory.completedMissions || [];
  const doneCount = plan.filter((item) => completed.includes(item.word)).length;
  const percent = plan.length ? Math.round((doneCount / plan.length) * 100) : 0;
  return { doneCount, total: plan.length, percent };
}
