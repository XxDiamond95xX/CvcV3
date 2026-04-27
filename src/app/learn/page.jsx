'use client';

import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight, Gauge, Home, RotateCcw, Route, ShieldCheck } from 'lucide-react';
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

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.22),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.12),transparent_28%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-b border-slate-800/80 bg-slate-950/86 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-[34rem] lg:border-b-0 lg:border-r xl:w-[38rem]">
          <header className="border-b border-slate-800/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400 hover:text-white">
                <Home size={15} /> Accueil
              </Link>
              <button onClick={resetProgress} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400 hover:text-white">
                <RotateCcw size={15} /> Réinitialiser
              </button>
            </div>

            <div className="mt-6 flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-glow">
                <BookOpen size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Parcours formation</p>
                <h1 className="text-xl font-black leading-tight text-white">{currentModule.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{currentModule.description}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span>Progression</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </header>

          <div className="border-b border-slate-800/80 p-3 sm:p-4">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 xl:grid-cols-3">
              {currentModule.chapters.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setChapter(index)}
                  className={`min-w-[10rem] rounded-2xl border px-3 py-3 text-left text-xs transition lg:min-w-0 ${
                    index === currentChapterIndex
                      ? 'border-blue-400 bg-blue-500/15 text-white shadow-lg shadow-blue-950/30'
                      : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-black">{String(index + 1).padStart(2, '0')}</span>
                  <span className="mt-1 line-clamp-2 block leading-snug">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          <section className="flex-1 overflow-y-auto p-5 sm:p-7">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                Chapitre {currentChapterIndex + 1} / {currentModule.chapters.length}
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">{chapter.title}</h2>
              <div className="mt-7">
                <TechnicalText content={chapter.content} />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4">
                  <Route className="mb-3 text-blue-200" size={20} />
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">À observer</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">Repère l’organe mis en évidence, puis lis les valeurs BP, HP, SH et SR avant de conclure.</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                  <ShieldCheck className="mb-3 text-emerald-200" size={20} />
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Réflexe sécurité</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">On confirme toujours un diagnostic par recoupement : mesures, échangeurs, débit d’air/eau et contexte.</p>
                </div>
              </div>

              <CheckpointQuiz checkpoint={chapter.checkpoint} />
            </div>
          </section>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-950/92 p-4 backdrop-blur sm:p-5">
            <button
              onClick={prevChapter}
              disabled={isFirst}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
            >
              <ChevronLeft size={18} /> <span className="hidden sm:inline">Précédent</span>
            </button>
            <button
              onClick={nextChapter}
              disabled={isLast}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
            >
              {isLast ? 'Module terminé' : 'Suivant'} <ChevronRight size={18} />
            </button>
          </footer>
        </aside>

        <section className="flex-1 p-4 sm:p-5 lg:h-screen lg:overflow-y-auto lg:p-7 xl:p-8">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Pratique synchronisée</p>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Le circuit répond au cours</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                Change de chapitre : le focus 3D, les couleurs du fluide, les valeurs et le diagnostic se mettent à jour ensemble.
              </p>
            </div>
            <Link href="/simulator" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-5 py-3 font-black text-slate-200 transition hover:border-blue-400 hover:text-white">
              <Gauge size={18} /> Mode expert
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="BP" value={activeSimulationParams.bp} unit="bar" hint="Aspiration" tone="blue" />
            <MetricCard label="HP" value={activeSimulationParams.hp} unit="bar" hint="Refoulement" tone="red" />
            <MetricCard label="SH" value={activeSimulationParams.sh} unit="K" hint="Surchauffe" tone="cyan" />
            <MetricCard label="SR" value={activeSimulationParams.sc} unit="K" hint="Sous-refroidissement" tone="orange" />
          </div>

          <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            <HvacCycle3D highlightedComponent={highlightedComponent} params={activeSimulationParams} size="default" />
            <div className="grid gap-5 content-start">
              <div className="rounded-[1.75rem] border border-blue-500/20 bg-blue-950/20 p-5 shadow-2xl shadow-black/20">
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
