'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gauge, ListChecks, MousePointerClick, RotateCcw, SlidersHorizontal, Zap } from 'lucide-react';
import HvacCycle3D from '@/components/HvacCycle3D';
import MetricCard from '@/components/MetricCard';
import MollierDiagram from '@/components/MollierDiagram';
import DiagnosticPanel from '@/components/DiagnosticPanel';
import { clamp, getScenarioSummary } from '@/lib/diagnostics';

const SCENARIOS = [
  {
    id: 'nominal',
    title: 'Cycle nominal',
    focus: 'all',
    description: 'Base de comparaison : échangeurs propres, alimentation stable et surchauffe correcte.',
    params: { bp: 4.5, hp: 18.2, sh: 5, sc: 3, fault: 'Réglage manuel nominal', effect: 'Les états du fluide sont bien répartis et le compresseur travaille dans une zone normale.' }
  },
  {
    id: 'dirty_condenser',
    title: 'Condenseur encrassé',
    focus: 'condenser',
    description: 'La chaleur s’évacue mal : la HP monte et le compresseur force.',
    params: { bp: 4.7, hp: 24.2, sh: 7, sc: 9, fault: 'Condenseur encrassé ou ventilation insuffisante', effect: 'La ligne de refoulement chauffe, la condensation devient difficile et le COP baisse.' }
  },
  {
    id: 'low_charge',
    title: 'Manque de charge',
    focus: 'liquidLine',
    description: 'Peu de fluide disponible : BP basse, SH élevée, SR faible.',
    params: { bp: 2.8, hp: 14.8, sh: 18, sc: 1, fault: 'Manque de charge probable', effect: 'L’évaporateur est sous-alimenté. La vapeur revient très surchauffée au compresseur.' }
  },
  {
    id: 'restricted_valve',
    title: 'Détendeur trop fermé',
    focus: 'expansionValve',
    description: 'Le débit est limité : l’évaporateur est affamé.',
    params: { bp: 2.9, hp: 17.2, sh: 19, sc: 5, fault: 'Détendeur trop fermé ou restriction', effect: 'La chute de pression existe, mais le débit ne suffit pas. La surchauffe augmente fortement.' }
  },
  {
    id: 'floodback',
    title: 'Risque retour liquide',
    focus: 'compressor',
    description: 'La surchauffe est trop basse : le compresseur peut recevoir du liquide.',
    params: { bp: 5.4, hp: 17.5, sh: 1, sc: 3, fault: 'Surchauffe trop faible', effect: 'Le compresseur est exposé à un retour liquide. On contrôle immédiatement l’alimentation de l’évaporateur.' }
  },
  {
    id: 'low_airflow',
    title: 'Débit d’air évaporateur faible',
    focus: 'evaporator',
    description: 'L’évaporateur reçoit peu de chaleur : BP basse et risque de givrage.',
    params: { bp: 3.0, hp: 18.0, sh: 6, sc: 3, fault: 'Débit d’air évaporateur insuffisant', effect: 'La température d’évaporation baisse. Le givrage peut apparaître si la situation persiste.' }
  }
];

const DEFAULT_PARAMS = SCENARIOS[0].params;

function Slider({ label, value, min, max, step, unit, help, onChange }) {
  return (
    <label className="block rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm text-slate-400">{help}</p>
        </div>
        <div className="font-mono text-2xl font-black text-white">
          {value} <span className="text-sm text-slate-500">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-5 w-full accent-blue-500"
      />
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  );
}

export default function SimulatorPage() {
  const [rawParams, setRawParams] = useState(DEFAULT_PARAMS);
  const [scenarioId, setScenarioId] = useState('nominal');

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
      fault: rawParams.fault ?? 'Réglage manuel',
      effect: rawParams.effect ?? 'Observe les conséquences sur les couleurs du circuit, le diagnostic et le diagramme P-h.'
    };
  }, [rawParams]);

  const selectedScenario = SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? SCENARIOS[0];

  const focus = useMemo(() => {
    if (scenarioId !== 'custom') return selectedScenario.focus;
    if (params.hp >= 21) return 'condenser';
    if (params.bp <= 3.2 && params.sh >= 12) return 'expansionValve';
    if (params.sh <= 3) return 'compressor';
    if (params.bp <= 3.4) return 'evaporator';
    return 'all';
  }, [params, scenarioId, selectedScenario.focus]);

  const updateParam = (key) => (value) => {
    setScenarioId('custom');
    setRawParams((current) => ({
      ...current,
      [key]: value,
      fault: 'Réglage manuel',
      effect: 'Tu modifies une valeur terrain : observe quel organe devient prioritaire et quelles pistes de diagnostic apparaissent.'
    }));
  };

  const applyScenario = (scenario) => {
    setScenarioId(scenario.id);
    setRawParams(scenario.params);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto w-full max-w-[96rem] px-5 py-6 lg:px-8">
        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400">
              <ArrowLeft size={15} /> Retour accueil
            </Link>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Mode expert pédagogique</p>
            <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">Simulateur de circuit frigorifique</h1>
            <p className="mt-4 max-w-4xl text-slate-400">Choisis un défaut type ou ajuste les valeurs. La vue 3D montre les tuyauteries, les changements d’état, les organes concernés et les conséquences techniques.</p>
          </div>
          <button
            onClick={() => applyScenario(SCENARIOS[0])}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500"
          >
            <RotateCcw size={18} /> Reset nominal
          </button>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.76fr_1.24fr]">
          <aside className="space-y-5">
            <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white">
                  <SlidersHorizontal />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Commandes</p>
                  <h2 className="text-xl font-black text-white">Scénarios et valeurs terrain</h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="text-amber-300" size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Défauts types</p>
              </div>
              <div className="grid gap-2">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => applyScenario(scenario)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      scenarioId === scenario.id
                        ? 'border-blue-400 bg-blue-500/15 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-blue-400 hover:text-white'
                    }`}
                    type="button"
                  >
                    <span className="block text-sm font-black">{scenario.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{scenario.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Basse pression" value={rawParams.bp} min={2.2} max={7.5} step={0.1} unit="bar" help="Aspiration / évaporation" onChange={updateParam('bp')} />
            <Slider label="Haute pression" value={rawParams.hp} min={10} max={26} step={0.1} unit="bar" help="Refoulement / condensation" onChange={updateParam('hp')} />
            <Slider label="Surchauffe" value={rawParams.sh} min={0} max={22} step={1} unit="K" help="Protection du compresseur" onChange={updateParam('sh')} />
            <Slider label="Sous-refroidissement" value={rawParams.sc} min={0} max={14} step={1} unit="K" help="Qualité de la ligne liquide" onChange={updateParam('sc')} />
          </aside>

          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="BP" value={params.bp} unit="bar" hint="Aspiration" />
              <MetricCard label="HP" value={params.hp} unit="bar" hint="Refoulement" />
              <MetricCard label="SH" value={params.sh} unit="K" hint="Protection compresseur" />
              <MetricCard label="SR" value={params.sc} unit="K" hint="Réserve liquide" />
            </div>

            <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
              <HvacCycle3D highlightedComponent={focus} params={params} />
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex items-center gap-3">
                    <Gauge className="text-blue-300" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Performance estimée</p>
                      <h3 className="text-2xl font-black text-white">COP {params.cop}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{params.effect}</p>
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

                <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ListChecks className="text-blue-300" size={18} />
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Lecture pédagogique</p>
                  </div>
                  <h3 className="text-xl font-black text-white">{params.fault}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{getScenarioSummary(params)}</p>
                  <div className="mt-4 rounded-2xl bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-400">
                    <span className="font-black text-slate-200">Consigne d’exercice :</span> modifie une seule valeur à la fois, observe l’organe mis en avant, puis explique la conséquence avant de regarder le diagnostic.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm leading-relaxed text-slate-400">
                  <div className="mb-2 flex items-center gap-2 font-black text-white">
                    <MousePointerClick className="text-blue-300" size={18} /> Interaction 3D
                  </div>
                  Tu peux tourner le circuit, zoomer, cliquer sur un organe et lire son rôle. Les couleurs des tuyaux représentent l’état du fluide, pas une température absolue.
                </div>
              </div>
            </div>

            <DiagnosticPanel params={params} />
            <MollierDiagram params={params} />
          </section>
        </section>
      </div>
    </main>
  );
}
