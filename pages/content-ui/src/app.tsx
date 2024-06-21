import React, { useEffect } from 'react';

interface TitleEvalResultProps {
  result: {
    evaluation_rating: string;
    evaluation_context: string;
  };
}

const ratingToClassName = (rating: string): string => {
  switch (rating) {
    case 'relevant':
      return 'bg-green-200'; // Corresponding Tailwind class
    case 'not_sure':
      return 'bg-yellow-200';
    case 'irrelevant':
      return 'bg-orange-200';
    case 'avoid':
      return 'bg-red-200';
    default:
      return 'bg-white';
  }
};

export const TitleEvalResult: React.FC<TitleEvalResultProps> = ({ result }) => {
  useEffect(() => {
    console.log('NEW content ui loaded');
  }, []);

  const ratingColor = ratingToClassName(result.evaluation_rating);
  return (
    <div className={`my-8 flex flex-col gap-1 text-black rounded-xl p-4 ${ratingColor}`}>
      <p>{result.evaluation_context}</p>
    </div>
  );
};
