import Link from 'next/link';
import { ArrowRight, BookOpen, Gauge, ShieldCheck, Snowflake, Workflow } from 'lucide-react';

const cards = [
  {
    href: '/learn',
    title: 'Mode apprentissage',
    description: 'Cours structuré, simulateur synchronisé et checkpoints pour former les nouveaux arrivants sans les perdre.',
    icon: BookOpen,
    cta: 'Commencer le module'
  },
  {
    href: '/simulator',
    title: 'Mode expert terrain',
    description: 'Scénarios de panne, réglage BP / HP / SH / SR, circuit 3D et diagnostic assisté.',
    icon: Gauge,
    cta: 'Ouvrir le simulateur'
  }
];

const strengths = [
  'Circuit frigorifique 3D lisible',
  'Changements d’état visibles',
  'Purge, tirage au vide, antigel',
  'Diagnostic par recoupement'
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.32),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 shadow-glow">
              <Snowflake size={24} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-300">CVC Academy</p>
              <p className="text-xs text-slate-500">Formation frigorifique interactive</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-xs font-bold text-slate-400 md:flex">
            <Workflow size={15} /> Next.js · Three.js · Tailwind
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              Produit de formation métier
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-white md:text-7xl">
              Apprendre le froid comme sur une vraie installation.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Une application CVC pensée pour l’onboarding : théorie progressive, circuit 3D interactif, états du fluide visibles et diagnostic terrain.
            </p>

            <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
              {strengths.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/62 p-3">
                  <ShieldCheck size={18} className="text-emerald-300" />
                  <span className="text-sm font-bold text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/learn" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-500">
                Lancer le cours <ArrowRight size={18} />
              </Link>
              <Link href="/simulator" className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-6 py-4 font-black text-slate-200 transition hover:border-blue-400 hover:text-white">
                Tester les valeurs
              </Link>
            </div>
          </div>

          <div className="grid gap-5">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href} className="group rounded-[2rem] border border-slate-800 bg-slate-950/70 p-7 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-blue-400/70">
                  <div className="flex items-start justify-between gap-5">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-blue-300 ring-1 ring-slate-800 transition group-hover:bg-blue-600 group-hover:text-white">
                      <Icon size={26} />
                    </div>
                    <ArrowRight className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-300" />
                  </div>
                  <h2 className="mt-7 text-2xl font-black text-white">{card.title}</h2>
                  <p className="mt-3 leading-relaxed text-slate-400">{card.description}</p>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-blue-300">{card.cta}</p>
                </Link>
              );
            })}

            <div className="rounded-[2rem] border border-blue-400/20 bg-blue-500/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">Positionnement</p>
              <p className="mt-3 text-sm leading-relaxed text-blue-50/85">
                Le but n’est pas de remplacer la pratique terrain, mais de préparer les nouveaux arrivants à lire un circuit, poser les bonnes questions et éviter les mauvaises conclusions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
