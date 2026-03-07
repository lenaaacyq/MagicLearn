"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

type Payload = { message: string; updatedAt: number };

const storageKey = "magic_merlin_tip_v1";
const seenKey = "magic_merlin_tip_seen_at_v1";

const readPayload = (): Payload | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const message = typeof parsed.message === "string" ? parsed.message : "";
    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
    if (!message) return null;
    return { message, updatedAt };
  } catch {
    return null;
  }
};

const readSeenAt = () => {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(seenKey);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
};

const writeSeenAt = (value: number) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(seenKey, String(value));
};

export default function MerlinGlobalTip() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const lastSeenRef = useMemo(() => ({ value: 0 }), []);

  useEffect(() => {
    const apply = () => {
      const next = readPayload();
      if (!next) return;
      const seenAt = readSeenAt();
      if (next.updatedAt <= seenAt) return;
      if (next.updatedAt <= lastSeenRef.value) return;
      lastSeenRef.value = next.updatedAt;
      setPayload(next);
      setOpen(true);
      writeSeenAt(next.updatedAt);
    };

    apply();
    const timer = window.setInterval(apply, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [lastSeenRef]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), 15000);
    return () => window.clearTimeout(timer);
  }, [open, payload?.updatedAt]);

  return (
    <AnimatePresence>
      {open && payload ? (
        <motion.div
          className="fixed right-6 bottom-[95px] z-50 w-[340px] pointer-events-auto"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <div className="glass-panel-gold rounded-3xl px-5 py-4 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="关闭梅林提示"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-2xl flex-shrink-0">
                🧙‍♂️
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-[var(--neon-gold)]" />
                  <span className="text-sm font-semibold text-[var(--neon-gold)]">
                    魔法导师 梅林
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--foreground)]/90 break-words">
                  {payload.message}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
