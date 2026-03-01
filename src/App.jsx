import React, { useEffect, useMemo, useState } from "react";
import {
  buildPlan,
  generateResponse,
  getModelCatalog,
  getPersonas,
  getPreferredModel,
  getProgress,
  loadMemory,
  saveMemory,
  updateMemory,
} from "./agent.js";

const personas = getPersonas();
const modelCatalog = getModelCatalog();
const preferredModel = getPreferredModel(modelCatalog);

function useSpeechVoices() {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    const update = () => setVoices(window.speechSynthesis?.getVoices?.() || []);
    update();
    window.speechSynthesis?.addEventListener?.("voiceschanged", update);
    return () =>
      window.speechSynthesis?.removeEventListener?.("voiceschanged", update);
  }, []);
  return voices;
}

export default function App() {
  const [name, setName] = useState("小星");
  const [level, setLevel] = useState("beginner");
  const [persona, setPersona] = useState("hogwarts");
  const [mediaUrl, setMediaUrl] = useState("");
  const [memory, setMemory] = useState(loadMemory());
  const [word, setWord] = useState("");
  const [emotion, setEmotion] = useState("calm");
  const [result, setResult] = useState("success");
  const [message, setMessage] = useState("");
  const [input, setInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const voices = useSpeechVoices();

  const plan = useMemo(() => buildPlan(level), [level]);
  const progress = useMemo(() => getProgress(plan, memory), [plan, memory]);

  useEffect(() => {
    saveMemory(memory);
  }, [memory]);

  const handleGenerate = () => {
    const nextMemory = updateMemory(memory, { word, emotion, result });
    setMemory(nextMemory);
    const response = generateResponse({
      persona,
      name,
      word,
      emotion,
      result,
      memory: nextMemory,
    });
    setMessage(response);
    if (input.trim()) {
      setInput("");
    }
  };

  const handleSpeak = () => {
    if (!message || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(message);
    const voice = voices.find((item) => item.name === selectedVoice);
    if (voice) utter.voice = voice;
    utter.rate = persona === "hogwarts" ? 0.95 : persona === "idol" ? 1.05 : 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const hardWords = Object.entries(memory.hardWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">平行世界伴侣</p>
          <h1>在魔法学院学咒语（英语），和爱豆一起通关</h1>
          <p className="sub">
            不是做题工具，而是沉浸式IP陪伴。视频开场、情感语音、长期记忆与任务规划，构成AI
            Agent。
          </p>
          <p className="muted">
            仅用于内部教学/作品集展示，非商业用途；如涉及第三方IP素材，请确保授权或使用原创替代。
          </p>
        </div>
        <div className="model-card">
          <h3>默认生成模型</h3>
          <p>{preferredModel.vendor}</p>
          <p className="muted">{preferredModel.description}</p>
          <div className="model-grid">
            {modelCatalog.map((model) => (
              <div key={model.id} className="model-item">
                <span>{model.vendor}</span>
                <span className="chip">{model.region}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>多模态开场</h2>
          <p>用视频解决用户冷启动，让IP直接开口。</p>
        </div>
        <div className="media">
          <div className="media-frame">
            {mediaUrl ? (
              <video src={mediaUrl} controls autoPlay muted />
            ) : (
              <div className="media-placeholder">
                <p>粘贴视频URL展示生成内容</p>
                <span>Runway / Pika / Sora 或国产视频生成</span>
              </div>
            )}
          </div>
          <div className="media-form">
            <label>
              开场视频链接
              <input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label>
              角色选择
              <select
                value={persona}
                onChange={(event) => setPersona(event.target.value)}
              >
                {Object.entries(personas).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}｜{value.style}
                  </option>
                ))}
              </select>
            </label>
            <label>
              学习搭档
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="表妹名字"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>任务规划</h2>
            <p>把背单词变成剧情任务线。</p>
          </div>
          <div className="progress">
            <div className="progress-label">
              任务进度 {progress.doneCount}/{progress.total} · {progress.percent}%
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
          <label className="block">
            学习阶段
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
          </label>
          <div className="mission-map">
            {plan.map((item) => (
              <div
                key={item.id}
                className={`mission ${
                  memory.completedMissions.includes(item.word) ? "done" : ""
                }`}
              >
                <h4>{item.title}</h4>
                <p>{item.goal}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>情感语音互动</h2>
            <p>语音输入 + 情绪识别 + 角色音色反馈。</p>
          </div>
          <div className="form-grid">
            <label>
              当前单词
              <input
                value={word}
                onChange={(event) => setWord(event.target.value)}
                placeholder="例如：spell"
              />
            </label>
            <label>
              情绪状态
              <select
                value={emotion}
                onChange={(event) => setEmotion(event.target.value)}
              >
                <option value="calm">平稳</option>
                <option value="nervous">紧张</option>
                <option value="excited">兴奋</option>
              </select>
            </label>
            <label>
              发音结果
              <select
                value={result}
                onChange={(event) => setResult(event.target.value)}
              >
                <option value="success">读得清晰</option>
                <option value="struggle">读得吃力</option>
              </select>
            </label>
            <label>
              语音输入文本
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="模拟语音转写"
              />
            </label>
          </div>
          <div className="actions">
            <button className="primary" onClick={handleGenerate}>
              生成角色反馈
            </button>
            <button onClick={handleSpeak}>播放角色语音</button>
          </div>
          <div className="voice-select">
            <label>
              语音音色
              <select
                value={selectedVoice}
                onChange={(event) => setSelectedVoice(event.target.value)}
              >
                <option value="">系统默认</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="response">
            <h3>角色回应</h3>
            <p>{message || "等待你的语音练习..."}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>长期记忆</h2>
          <p>记录卡点单词与上次情绪，为个性化教学做铺垫。</p>
        </div>
        <div className="memory-grid">
          <div className="memory-card">
            <h4>上次情绪</h4>
            <p>{memory.lastEmotion}</p>
          </div>
          <div className="memory-card">
            <h4>上次卡点</h4>
            <p>{memory.lastWord || "暂无"}</p>
          </div>
          <div className="memory-card">
            <h4>高频卡点</h4>
            <div className="tag-list">
              {hardWords.length ? (
                hardWords.map(([item, count]) => (
                  <span key={item} className="tag">
                    {item} · {count}
                  </span>
                ))
              ) : (
                <span className="tag">暂无记录</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
