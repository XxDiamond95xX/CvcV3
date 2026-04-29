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

function Tag({ children }) {
  return (
    <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
      {children}
    </span>
  );
}

function FieldList({ title, items }) {
  if (!items?.length) return null;

  return (
    <details className="rounded-3xl border border-slate-800 bg-slate-900/55 p-4 open:bg-slate-900/80 sm:p-5">
      <summary className="cursor-pointer list-none text-sm font-black text-white">
        {title}
        <span className="ml-2 text-xs font-bold text-slate-500">ouvrir</span>
      </summary>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MissionCard({ chapter }) {
  const mission = chapter.mission;

  return (
    <section className="mt-8 grid gap-4">
      <div className="rounded-[1.5rem] border border-blue-400/20 bg-blue-500/10 p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">Mission terrain</p>
        <h3 className="mt-2 text-lg font-black text-white sm:text-xl">{mission?.title || 'Mise en pratique du chapitre'}</h3>
        {mission?.context ? <p className="mt-3 text-sm leading-7 text-blue-100/80">{mission.context}</p> : null}
        {mission?.objective ? (
          <div className="mt-4 rounded-2xl bg-slate-950/55 p-4 text-sm leading-7 text-slate-300">
            <span className="font-black text-white">Objectif : </span>{mission.objective}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FieldList title="Actions terrain" items={mission?.actions || chapter.fieldChecklist} />
        <FieldList title="Pièges fréquents" items={chapter.commonMistakes} />
      </div>

      {chapter.proTip ? (
        <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100 sm:p-5">
          <p className="font-black text-amber-50">Conseil pro</p>
          <p className="mt-1">{chapter.proTip}</p>
        </div>
      ) : null}
    </section>
  );
}

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
      <div className="flex min-h-screen flex-col xl:flex-row">
        <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-950/90 xl:h-screen xl:w-[42rem] xl:border-b-0 xl:border-r">
          <header className="border-b border-slate-800 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400">
                <Home size={15} /> Accueil
              </Link>
              <button onClick={resetProgress} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400">
                <RotateCcw size={15} /> Réinitialiser
              </button>
            </div>

            <div className="mt-5 flex items-start gap-3 sm:mt-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-glow">
                <BookOpen size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Module</p>
                <h2 className="mt-1 text-base font-black leading-tight text-white sm:text-lg">{currentModule.title}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {chapter.professional_level ? <Tag>{chapter.professional_level}</Tag> : null}
                  {chapter.competency ? <Tag>{chapter.competency}</Tag> : null}
                  {chapter.criticality ? <Tag>{chapter.criticality}</Tag> : null}
                </div>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <details className="border-b border-slate-800 bg-slate-950/75">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm font-black text-white transition hover:bg-slate-900/70 sm:px-5">
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.24em] text-blue-300">Navigation compacte</span>
                <span className="mt-1 block truncate text-slate-200">{String(currentChapterIndex + 1).padStart(2, '0')} · {chapter.title}</span>
              </span>
              <span className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">Chapitres</span>
            </summary>
            <div className="max-h-80 overflow-y-auto border-t border-slate-800 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            </div>
          </details>

          <section className="flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
            <div className="mx-auto max-w-[44rem]">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                Chapitre {currentChapterIndex + 1} / {currentModule.chapters.length}
              </p>
              <h1 className="mt-4 text-2xl font-black leading-tight text-white sm:text-4xl">{chapter.title}</h1>

              {chapter.estimated_minutes ? (
                <p className="mt-3 text-sm font-bold text-slate-500">Temps estimé : {chapter.estimated_minutes} min · rôle : {chapter.role || 'technicien exploitation'}</p>
              ) : null}

              <article className="mt-7 rounded-[1.5rem] border border-slate-800 bg-slate-900/45 p-4 text-[15px] leading-8 text-slate-200 sm:p-6 sm:text-base sm:leading-8">
                <TechnicalText content={chapter.content} />
              </article>

              <MissionCard chapter={chapter} />

              {quizItems.length > 0 ? (
                <section className="mt-8">
                  <div className="mb-2 rounded-[1.5rem] border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Quiz de validation</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Réponds aux questions pour vérifier que la notion est comprise avant de passer au chapitre suivant.</p>
                  </div>
                  <div className="grid gap-4">
                    {quizItems.map((item, quizIndex) => (
                      <CheckpointQuiz
                        key={`${chapter.id}-${quizIndex}-${item.question}`}
                        checkpoint={item}
                        index={quizIndex}
                        total={quizItems.length}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur sm:p-5">
            <button
              onClick={prevChapter}
              disabled={isFirst}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
            >
              <ChevronLeft size={18} /> Précédent
            </button>
            <button
              onClick={nextChapter}
              disabled={isLast}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
            >
              {isLast ? 'Module terminé' : 'Suivant'} <ChevronRight size={18} />
            </button>
          </footer>
        </aside>

        <section className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7 xl:h-screen xl:p-8">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Pratique synchronisée</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Modèle 3D de l’installation</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Le modèle représente la chaîne dry adiabatique, chiller assist, continuous cooling, salle IT, riser et énergie critique. Sur mobile, utilise <span className="font-bold text-slate-200">Dézoom +</span> dans la 3D.</p>
            </div>
            <Link href="/simulator" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-black text-slate-200 transition hover:border-blue-400">
              <Gauge size={18} /> Mode expert
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="BP" value={activeSimulationParams.bp} unit="bar" hint="Basse pression" />
            <MetricCard label="HP" value={activeSimulationParams.hp} unit="bar" hint="Haute pression" />
            <MetricCard label="SH" value={activeSimulationParams.sh} unit="K" hint="Surchauffe" />
            <MetricCard label="SR" value={activeSimulationParams.sc} unit="K" hint="Sous-refroidissement" />
          </div>

          <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <HvacCycle3D highlightedComponent={highlightedComponent} params={activeSimulationParams} />
            <div className="grid gap-5 content-start">
              <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">État simulé</p>
                <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{activeSimulationParams.fault}</h3>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase text-slate-500">T évap.</p>
                    <p className="font-mono text-lg font-black text-white sm:text-xl">{activeSimulationParams.evapTemp}°C</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase text-slate-500">T cond.</p>
                    <p className="font-mono text-lg font-black text-white sm:text-xl">{activeSimulationParams.condTemp}°C</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase text-slate-500">COP</p>
                    <p className="font-mono text-lg font-black text-white sm:text-xl">{activeSimulationParams.cop}</p>
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
