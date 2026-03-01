"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";

const mainBgmSrc = "/audio/bgm-main.mp3";
const questionBgmSrc = "/audio/bgm-questions.mp3";

export default function BgmController() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isBgmOn, setIsBgmOn] = useState(true);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const bgmSrc = useMemo(() => {
    if (!pathname) return mainBgmSrc;
    return pathname.startsWith("/question") ? questionBgmSrc : mainBgmSrc;
  }, [pathname]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0.5;
    if (audio.src !== bgmSrc) {
      audio.src = bgmSrc;
      audio.currentTime = 0;
    }
    if (isBgmOn) {
      audio
        .play()
        .then(() => {
          setNeedsUserGesture(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setNeedsUserGesture(true);
          setIsPlaying(false);
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [bgmSrc, isBgmOn]);

  useEffect(() => {
    if (!needsUserGesture || !isBgmOn) return;
    const handle = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio
        .play()
        .then(() => setNeedsUserGesture(false))
        .catch(() => {});
    };
    window.addEventListener("pointerdown", handle, { once: true });
    return () => window.removeEventListener("pointerdown", handle);
  }, [needsUserGesture, isBgmOn]);

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isPlaying) {
      setIsBgmOn(true);
      audio
        .play()
        .then(() => {
          setNeedsUserGesture(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setNeedsUserGesture(true);
          setIsPlaying(false);
        });
      return;
    }
    setIsBgmOn(false);
    audio.pause();
    setIsPlaying(false);
  };

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div className="fixed bottom-[5px] right-6 z-50 group">
        {needsUserGesture && isBgmOn && (
          <button
            className="absolute bottom-12 right-0 -translate-x-4 whitespace-nowrap rounded-lg bg-black/85 px-3 py-2 text-xs text-white shadow-lg bgm-sync-pulse"
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              audio
                .play()
                .then(() => {
                  setNeedsUserGesture(false);
                  setIsPlaying(true);
                })
                .catch(() => {
                  setNeedsUserGesture(true);
                  setIsPlaying(false);
                });
            }}
            type="button"
          >
            <span className="mr-1 inline-block">✨</span>
            点击开启背景音乐
            <span className="ml-1 inline-block">✨</span>
          </button>
        )}
        {!needsUserGesture && (
          <div className="absolute bottom-14 right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-3 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {isPlaying ? "关闭背景音乐" : "开启背景音乐"}
          </div>
        )}
        <button
          className={`w-10 h-10 glass-panel rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors ${
            needsUserGesture ? "scale-110 shadow-[0_0_16px_rgba(255,255,255,0.35)] bgm-sync-pulse" : ""
          }`}
          onClick={handleToggle}
          aria-label={
            needsUserGesture ? "开启背景音乐" : isPlaying ? "关闭背景音乐" : "开启背景音乐"
          }
          type="button"
        >
          {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
