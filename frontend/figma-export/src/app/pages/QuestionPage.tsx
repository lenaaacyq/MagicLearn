import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import GrammarQuestion from '../components/questions/GrammarQuestion';
import ReadingQuestion from '../components/questions/ReadingQuestion';
import ListeningQuestion from '../components/questions/ListeningQuestion';

export default function QuestionPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const handleComplete = () => {
    // 完成后返回首页
    navigate('/');
  };

  const renderQuestion = () => {
    switch (type) {
      case 'grammar':
        return <GrammarQuestion onComplete={handleComplete} />;
      case 'reading':
        return <ReadingQuestion onComplete={handleComplete} />;
      case 'listening':
        return <ListeningQuestion onComplete={handleComplete} />;
      default:
        return <GrammarQuestion onComplete={handleComplete} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderQuestion()}
    </div>
  );
}
