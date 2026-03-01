"use client";

import { useMemo } from "react";
import GrammarQuestion from "../components/questions/GrammarQuestion";
import ListeningQuestion from "../components/questions/ListeningQuestion";
import ReadingQuestion from "../components/questions/ReadingQuestion";
import { useRouter } from "next/navigation";

interface QuestionPageProps {
  type: string;
}

export default function QuestionPage({ type }: QuestionPageProps) {
  const router = useRouter();

  const handleComplete = () => {
    router.push("/");
  };

  const content = useMemo(() => {
    switch (type) {
      case "grammar":
        return <GrammarQuestion onComplete={handleComplete} />;
      case "reading":
        return <ReadingQuestion onComplete={handleComplete} />;
      case "listening":
        return <ListeningQuestion onComplete={handleComplete} />;
      default:
        return <GrammarQuestion onComplete={handleComplete} />;
    }
  }, [type]);

  return <div className="min-h-screen">{content}</div>;
}
