'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gauge, RotateCcw, SlidersHorizontal } from 'lucide-react';
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

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <label className="block rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm text-slate-400">Min {min} · Max {max}</p>
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
    </label>
  );
}

export default function SimulatorPage() {
  const [rawParams, setRawParams] = useState(DEFAULT_PARAMS);

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
      fault: 'Réglage manuel'
    };
  }, [rawParams]);

  const focus = useMemo(() => {
    if (params.hp >= 21) return 'condenser';
    if (params.bp <= 3.2 && params.sh >= 12) return 'expansionValve';
    if (params.sh <= 3) return 'compressor';
    if (params.bp <= 3.4) return 'evaporator';
    return 'all';
  }, [params]);

  const updateParam = (key) => (value) => setRawParams((current) => ({ ...current, [key]: value }));

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8">
        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400">
              <ArrowLeft size={15} /> Retour accueil
            </Link>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Mode expert</p>
            <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">Simulateur Mollier CVC</h1>
            <p className="mt-4 max-w-3xl text-slate-400">Ajuste les pressions et les écarts thermiques pour observer le circuit 3D, le diagramme P-h et le diagnostic assisté.</p>
          </div>
          <button
            onClick={() => setRawParams(DEFAULT_PARAMS)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500"
          >
            <RotateCcw size={18} /> Reset nominal
          </button>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <aside className="space-y-5">
            <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white">
                  <SlidersHorizontal />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Commandes</p>
                  <h2 className="text-xl font-black text-white">Paramètres terrain</h2>
                </div>
              </div>
            </div>

            <Slider label="Basse pression" value={rawParams.bp} min={2.2} max={7.5} step={0.1} unit="bar" onChange={updateParam('bp')} />
            <Slider label="Haute pression" value={rawParams.hp} min={10} max={26} step={0.1} unit="bar" onChange={updateParam('hp')} />
            <Slider label="Surchauffe" value={rawParams.sh} min={0} max={22} step={1} unit="K" onChange={updateParam('sh')} />
            <Slider label="Sous-refroidissement" value={rawParams.sc} min={0} max={14} step={1} unit="K" onChange={updateParam('sc')} />
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
            </div>

            <MollierDiagram params={params} />
          </section>
        </section>
      </div>
    </main>
  );
}
