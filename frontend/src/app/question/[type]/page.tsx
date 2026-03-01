import QuestionPage from "../../../figma/pages/QuestionPage";

interface PageProps {
  params: {
    type: string;
  };
}

export default function Page({ params }: PageProps) {
  return <QuestionPage type={params.type} />;
}
