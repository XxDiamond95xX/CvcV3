'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function CheckpointQuiz({ checkpoint, index = 0, total = 1 }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    setSelectedAnswer(null);
  }, [checkpoint?.question]);

  if (!checkpoint) return null;

  const answerStatus = selectedAnswer === null
    ? null
    : selectedAnswer === checkpoint.correct
      ? 'correct'
      : 'incorrect';

  return (
    <div className="mt-5 rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">
          Question terrain {total > 1 ? `${index + 1}/${total}` : ''}
        </p>
        {answerStatus ? (
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${answerStatus === 'correct' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
            {answerStatus === 'correct' ? 'Correct' : 'À revoir'}
          </span>
        ) : null}
      </div>

      <h3 className="text-lg font-black text-white">{checkpoint.question}</h3>

      <div className="mt-4 grid gap-2">
        {checkpoint.answers.map((answer, answerIndex) => {
          const isSelected = selectedAnswer === answerIndex;
          const isCorrect = checkpoint.correct === answerIndex;
          const showCorrect = selectedAnswer !== null && isCorrect;
          const showWrong = isSelected && answerStatus === 'incorrect';

          return (
            <button
              key={`${checkpoint.question}-${answer}`}
              type="button"
              onClick={() => setSelectedAnswer(answerIndex)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                showCorrect
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                  : showWrong
                    ? 'border-red-400 bg-red-500/10 text-red-100'
                    : 'border-slate-700 bg-slate-900 hover:border-blue-400 hover:bg-blue-500/10'
              }`}
            >
              <span className="font-bold">{String.fromCharCode(65 + answerIndex)}.</span> {answer}
            </button>
          );
        })}
      </div>

      {selectedAnswer !== null ? (
        <div className="mt-4 flex gap-3 rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300">
          {answerStatus === 'correct' ? (
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
          ) : (
            <XCircle className="mt-0.5 shrink-0 text-red-400" size={18} />
          )}
          <p>{checkpoint.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
