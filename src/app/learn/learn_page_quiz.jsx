'use client';

import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight, Gauge, Home, RotateCcw } from 'lucide-react';
import HvacCycle3D from '@/components/HvacCycle3D';
import MetricCard from '@/components/MetricCard';
import TechnicalText from '@/components/TechnicalText';
import CheckpointQuiz from '@/components/CheckpointQuiz';
import MollierDiagram from '@/components/MollierDiagram';
import DiagnosticPanel from '@/components/DiagnosticPanel';
import { useLearningStore } from '@/store/useLearningStore';

export default function LearningInterface() {
  const {
    currentModule,
    currentChapterIndex,
    nextChapter,
    prevChapter,
    setChapter,
    resetProgress,
    activeSimulationParams,
    highlightedComponent
  } = useLearningStore();

  const chapter = currentModule.chapters[currentChapterIndex];
  const isLast = currentChapterIndex === currentModule.chapters.length - 1;
  const isFirst = currentChapterIndex === 0;
  const progress = ((currentChapterIndex + 1) / currentModule.chapters.length) * 100;
  const quizItems = chapter.quiz || (chapter.checkpoint ? [chapter.checkpoint] : []);

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-r border-slate-800 bg-slate-950/80 lg:h-screen lg:w-[39rem]">
          <header className="border-b border-slate-800 p-5">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400">
                <Home size={15} /> Accueil
              </Link>
              <button onClick={resetProgress} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400">
                <RotateCcw size={15} /> Réinitialiser
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-glow">
                <BookOpen size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Module</p>
                <h2 className="font-black text-white">{currentModule.title}</h2>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 p-4 md:grid-cols-3">
            {currentModule.chapters.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setChapter(index)}
                className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${
                  index === currentChapterIndex
                    ? 'border-blue-400 bg-blue-500/15 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-200'
                }`}
              >
                <span className="block font-black">{String(index + 1).padStart(2, '0')}</span>
                <span className="mt-1 line-clamp-2 block leading-snug">{item.title}</span>
              </button>
            ))}
          </div>

          <section className="flex-1 overflow-y-auto p-7">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Chapitre {currentChapterIndex + 1} / {currentModule.chapters.length}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white">{chapter.title}</h1>
            <div className="mt-7">
              <TechnicalText content={chapter.content} />
            </div>
            {quizItems.length > 0 ? (
              <div className="mt-8">
                <div className="mb-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Quiz de validation</p>
                  <p className="mt-2 text-sm text-slate-400">Réponds aux questions pour vérifier que la notion est comprise avant de passer au chapitre suivant.</p>
                </div>
                {quizItems.map((item, quizIndex) => (
                  <CheckpointQuiz
                    key={`${chapter.id}-${quizIndex}-${item.question}`}
                    checkpoint={item}
                    index={quizIndex}
                    total={quizItems.length}
                  />
                ))}
              </div>
            ) : null}
          </section>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 p-5">
            <button
              onClick={prevChapter}
              disabled={isFirst}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-5 py-3 font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={18} /> Précédent
            </button>
            <button
              onClick={nextChapter}
              disabled={isLast}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isLast ? 'Module terminé' : 'Suivant'} <ChevronRight size={18} />
            </button>
          </footer>
        </aside>

        <section className="flex-1 overflow-y-auto p-5 lg:h-screen lg:p-8">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Pratique synchronisée</p>
              <h2 className="mt-2 text-3xl font-black text-white">Le simulateur suit le cours</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">Change de chapitre : les valeurs, le focus 3D et le diagramme se mettent à jour automatiquement.</p>
            </div>
            <Link href="/simulator" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-black text-slate-200 transition hover:border-blue-400">
              <Gauge size={18} /> Mode expert
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="BP" value={activeSimulationParams.bp} unit="bar" hint="Basse pression" />
            <MetricCard label="HP" value={activeSimulationParams.hp} unit="bar" hint="Haute pression" />
            <MetricCard label="SH" value={activeSimulationParams.sh} unit="K" hint="Surchauffe" />
            <MetricCard label="SR" value={activeSimulationParams.sc} unit="K" hint="Sous-refroidissement" />
          </div>

          <div className="mt-5 grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
            <HvacCycle3D highlightedComponent={highlightedComponent} params={activeSimulationParams} />
            <div className="grid gap-5">
              <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">État simulé</p>
                <h3 className="mt-2 text-2xl font-black text-white">{activeSimulationParams.fault}</h3>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase text-slate-500">T évap.</p>
                    <p className="font-mono text-xl font-black text-white">{activeSimulationParams.evapTemp}°C</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase text-slate-500">T cond.</p>
                    <p className="font-mono text-xl font-black text-white">{activeSimulationParams.condTemp}°C</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase text-slate-500">COP</p>
                    <p className="font-mono text-xl font-black text-white">{activeSimulationParams.cop}</p>
                  </div>
                </div>
              </div>
              <DiagnosticPanel params={activeSimulationParams} />
            </div>
          </div>

          <div className="mt-5">
            <MollierDiagram params={activeSimulationParams} />
          </div>
        </section>
      </div>
    </main>
  );
}
