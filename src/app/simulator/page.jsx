'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gauge, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import HvacCycle3D from '@/components/HvacCycle3D';
import MetricCard from '@/components/MetricCard';
import MollierDiagram from '@/components/MollierDiagram';
import DiagnosticPanel from '@/components/DiagnosticPanel';
import { clamp } from '@/lib/diagnostics';

const DEFAULT_PARAMS = {
  bp: 4.5,
  hp: 18.2,
  sh: 5,
  sc: 3,
  evapTemp: 2,
  condTemp: 45,
  cop: 3.2,
  fault: 'Réglage manuel'
};

const SCENARIOS = [
  {
    label: 'Nominal',
    description: 'Valeurs équilibrées pour lecture pédagogique.',
    values: { bp: 4.5, hp: 18.2, sh: 5, sc: 3 }
  },
  {
    label: 'Condenseur encrassé',
    description: 'HP qui grimpe, échange de chaleur insuffisant.',
    values: { bp: 4.7, hp: 23.4, sh: 7, sc: 6 }
  },
  {
    label: 'Manque de charge',
    description: 'BP basse, SH élevée, SR faible.',
    values: { bp: 2.9, hp: 14.8, sh: 17, sc: 1 }
  },
  {
    label: 'Détendeur trop fermé',
    description: 'Évaporateur affamé, surchauffe élevée.',
    values: { bp: 3.0, hp: 17.6, sh: 18, sc: 5 }
  },
  {
    label: 'Retour liquide',
    description: 'Surchauffe trop faible, compresseur exposé.',
    values: { bp: 5.4, hp: 17.8, sh: 1, sc: 4 }
  },
  {
    label: 'Risque antigel',
    description: 'BP basse, évaporateur à surveiller.',
    values: { bp: 2.7, hp: 17.2, sh: 8, sc: 3 }
  }
];

function Slider({ label, value, min, max, step, unit, onChange, hint }) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <label className="block rounded-[1.35rem] border border-slate-800/90 bg-slate-950/76 p-4 transition hover:border-slate-700">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{hint}</p>
        </div>
        <div className="font-mono text-2xl font-black text-white">
          {value} <span className="text-sm text-slate-500">{unit}</span>
        </div>
      </div>
      <div className="mt-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-blue-500"
          style={{ backgroundSize: `${percent}% 100%` }}
        />
        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-600">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </label>
  );
}

export default function SimulatorPage() {
  const [rawParams, setRawParams] = useState(DEFAULT_PARAMS);
  const [activeScenario, setActiveScenario] = useState('Manuel');

  const params = useMemo(() => {
    const evapTemp = Math.round((rawParams.bp * 2.4 - 8) * 10) / 10;
    const condTemp = Math.round((rawParams.hp * 2.3 + 3) * 10) / 10;
    const lift = Math.max(1, condTemp - evapTemp);
    const cop = Math.round(clamp(7.8 - lift / 10 - rawParams.sh / 18 - rawParams.sc / 35, 1.1, 5.2) * 10) / 10;

    return {
      ...rawParams,
      evapTemp,
      condTemp,
      cop,
      fault: activeScenario === 'Manuel' ? 'Réglage manuel' : activeScenario
    };
  }, [rawParams, activeScenario]);

  const focus = useMemo(() => {
    if (params.hp >= 21) return 'condenser';
    if (params.bp <= 3.2 && params.sh >= 12) return 'expansionValve';
    if (params.sh <= 3) return 'compressor';
    if (params.bp <= 3.4) return 'evaporator';
    return 'all';
  }, [params]);

  const updateParam = (key) => (value) => {
    setActiveScenario('Manuel');
    setRawParams((current) => ({ ...current, [key]: value }));
  };

  const applyScenario = (scenario) => {
    setActiveScenario(scenario.label);
    setRawParams((current) => ({ ...current, ...scenario.values }));
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.2),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(14,165,233,0.14),transparent_26%)]" />

      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-7 xl:px-8">
        <header className="mb-6 flex flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-slate-950/65 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex-row lg:items-end lg:p-6">
          <div>
            <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400 hover:text-white">
              <ArrowLeft size={15} /> Retour accueil
            </Link>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Mode expert terrain</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-6xl">Simulateur CVC</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Ajuste les valeurs, observe le fluide dans les tuyauteries, puis confirme le diagnostic par croisement BP / HP / SH / SR.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setRawParams(DEFAULT_PARAMS);
                setActiveScenario('Manuel');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500"
            >
              <RotateCcw size={18} /> Reset nominal
            </button>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="space-y-5 xl:min-w-0">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="BP" value={params.bp} unit="bar" hint="Aspiration" tone="blue" />
              <MetricCard label="HP" value={params.hp} unit="bar" hint="Refoulement" tone="red" />
              <MetricCard label="SH" value={params.sh} unit="K" hint="Protection compresseur" tone="cyan" />
              <MetricCard label="SR" value={params.sc} unit="K" hint="Réserve liquide" tone="orange" />
            </div>

            <HvacCycle3D highlightedComponent={focus} params={params} size="expert" />

            <div className="grid gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/76 p-5 shadow-2xl shadow-black/20">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white">
                    <Gauge />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Performance estimée</p>
                    <h3 className="text-2xl font-black text-white">COP {params.cop}</h3>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-900 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">T évap.</p>
                    <p className="font-mono text-2xl font-black text-white">{params.evapTemp}°C</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">T cond.</p>
                    <p className="font-mono text-2xl font-black text-white">{params.condTemp}°C</p>
                  </div>
                </div>
              </div>

              <DiagnosticPanel params={params} />
            </div>

            <MollierDiagram params={params} />
          </section>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
            <div className="rounded-[1.75rem] border border-blue-500/20 bg-blue-950/20 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white">
                  <SlidersHorizontal />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Commandes</p>
                  <h2 className="text-xl font-black text-white">Paramètres terrain</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Un scénario charge des valeurs types. Dès que tu touches un curseur, tu passes en réglage manuel.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-blue-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Scénarios rapides</p>
              </div>
              <div className="grid gap-2">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.label}
                    onClick={() => applyScenario(scenario)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      activeScenario === scenario.label
                        ? 'border-blue-400 bg-blue-500/15 text-white'
                        : 'border-slate-800 bg-slate-900/55 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <p className="text-sm font-black">{scenario.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Slider label="Basse pression" value={rawParams.bp} min={2.2} max={7.5} step={0.1} unit="bar" hint="Côté évaporateur / aspiration." onChange={updateParam('bp')} />
              <Slider label="Haute pression" value={rawParams.hp} min={10} max={26} step={0.1} unit="bar" hint="Côté condenseur / refoulement." onChange={updateParam('hp')} />
              <Slider label="Surchauffe" value={rawParams.sh} min={0} max={22} step={1} unit="K" hint="Protection compresseur et alimentation évaporateur." onChange={updateParam('sh')} />
              <Slider label="Sous-refroidissement" value={rawParams.sc} min={0} max={14} step={1} unit="K" hint="Stabilité de la ligne liquide." onChange={updateParam('sc')} />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
