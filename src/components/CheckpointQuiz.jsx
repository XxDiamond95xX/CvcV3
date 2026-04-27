'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useLearningStore } from '@/store/useLearningStore';

export default function CheckpointQuiz({ checkpoint }) {
  const { selectedAnswer, answerStatus, answerCheckpoint } = useLearningStore();

  if (!checkpoint) return null;

  return (
    <div className="mt-8 rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Checkpoint terrain</p>
      <h3 className="text-lg font-black text-white">{checkpoint.question}</h3>
      <div className="mt-4 grid gap-2">
        {checkpoint.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = checkpoint.correct === index;
          const showCorrect = selectedAnswer !== null && isCorrect;
          const showWrong = isSelected && answerStatus === 'incorrect';

          return (
            <button
              key={answer}
              onClick={() => answerCheckpoint(index)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                showCorrect
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                  : showWrong
                    ? 'border-red-400 bg-red-500/10 text-red-100'
                    : 'border-slate-700 bg-slate-900 hover:border-blue-400 hover:bg-blue-500/10'
              }`}
            >
              <span className="font-bold">{String.fromCharCode(65 + index)}.</span> {answer}
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
