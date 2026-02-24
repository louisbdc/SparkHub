'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'
import {
  MessageSquare,
  LayoutGrid,
  Files,
  Users,
  ArrowRight,
  Zap,
  MoreHorizontal,
  Plus,
  Search,
  Paperclip,
} from 'lucide-react'

// --- Custom Styles & Animations ---
const styleTag = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;700&display=swap');

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(-6deg); }
    50%       { transform: translateY(-20px) rotate(-4deg); }
  }

  @keyframes float-delayed {
    0%, 100% { transform: translateY(0) rotate(4deg); }
    50%       { transform: translateY(-15px) rotate(6deg); }
  }

  @keyframes shimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  .animate-float         { animation: float 6s ease-in-out infinite; }
  .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }

  .shimmer-hover:hover .shimmer-bar {
    animation: shimmer 0.8s forwards;
  }

  .font-geist-mono { font-family: 'Geist Mono', monospace; }

  .noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.015;
  }

  .bento-card { transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
  .bento-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.12);
  }

  /* HowItWorks slide-over: initial state (card peeking 30px at bottom) */
  .how-it-works-card {
    transform: translateY(calc(100vh - 30px));
    border-radius: 4rem 4rem 0 0;
  }

  @keyframes howSnapUp {
    0%   { transform: translateY(calc(100vh - 30px)); }
    55%  { transform: translateY(-40px); }
    72%  { transform: translateY(14px); }
    84%  { transform: translateY(-10px); }
    93%  { transform: translateY(5px); }
    100% { transform: translateY(0); }
  }

  .how-snap-up {
    animation: howSnapUp 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes howSnapDown {
    0%   { transform: translateY(0); }
    25%  { transform: translateY(20px); }
    100% { transform: translateY(calc(100vh - 30px)); }
  }

  .how-snap-down {
    animation: howSnapDown 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  }
`

// ── Background ────────────────────────────────────────────────────────────────

function Background() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#fafafa] dark:bg-[#09090b]">
      <div className="noise absolute inset-0 z-50 pointer-events-none" />

      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(#e5e7eb 1px, transparent 1px),
            linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* SVG connectors */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.1] dark:opacity-[0.03] stroke-zinc-900 dark:stroke-white fill-none">
        <path d="M-50,200 Q300,400 600,200 T1200,400" strokeDasharray="12 12" strokeWidth="1" />
        <path d="M1400,800 C1100,600 800,900 600,700 S200,800 -100,600" strokeDasharray="12 12" strokeWidth="1" />
      </svg>

      {/* Floating widgets */}
      <div className="absolute top-[15%] left-[5%] opacity-30 dark:opacity-[0.1] animate-float">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-xl flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          <span className="font-geist-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">live_collaboration</span>
        </div>
      </div>

      <div className="absolute top-[25%] right-[8%] opacity-30 dark:opacity-[0.1] animate-float-delayed">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-2">
          <div className="w-12 h-1 bg-zinc-900 dark:bg-white rounded-full" />
          <div className="w-8 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <span className="font-geist-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-2">v2.4_build</span>
        </div>
      </div>

      {/* Mouse glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.02), transparent)`,
        }}
      />
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-geist-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 mb-6 block font-bold ${className}`}>
      {children}
    </span>
  )
}

function CTAButton({
  children,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}) {
  const base = 'relative overflow-hidden rounded-xl px-8 py-4 font-bold uppercase tracking-wider text-xs transition-all active:scale-[0.97] shimmer-hover group cursor-pointer'
  const styles = {
    primary:   'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900',
    secondary: 'bg-transparent border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white backdrop-blur-sm hover:bg-zinc-50 dark:hover:bg-white/5',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`}>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      <div className="shimmer-bar absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full z-0" />
    </button>
  )
}

// ── Dashboard Preview ─────────────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-6xl rounded-[3rem] border border-zinc-200/50 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 p-3 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="bg-white dark:bg-zinc-950 rounded-[2rem] overflow-hidden border border-zinc-200 dark:border-white/10 h-[600px] flex">

        {/* Sidebar */}
        <div className="w-16 md:w-64 border-r border-zinc-100 dark:border-white/5 flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg shrink-0" />
            <span className="font-bold hidden md:block dark:text-white">Workspace A</span>
          </div>
          <div className="space-y-1">
            {['Dashboard', 'Kanban', 'Messages', 'Files', 'Settings'].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium ${
                  i === 1 ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white' : 'text-zinc-400'
                }`}
              >
                <div className="w-4 h-4 bg-current opacity-20 rounded" />
                <span className="hidden md:block">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
          <header className="h-16 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between px-8 bg-white dark:bg-zinc-950">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-sm dark:text-zinc-100">Project Redesign</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-[10px] font-bold">ACTIVE</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900" />
              <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900" />
            </div>
          </header>

          <main className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Backlog', 'In Progress', 'Done'].map((col) => (
              <div key={col} className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-geist-mono text-[10px] uppercase tracking-widest text-zinc-400">{col}</span>
                  <Plus className="w-3 h-3 text-zinc-400" />
                </div>
                <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[8px] font-bold uppercase">Critical</span>
                    <MoreHorizontal className="w-3 h-3 text-zinc-400" />
                  </div>
                  <div className="text-xs font-bold dark:text-zinc-100 leading-tight">Implement global state for workspaces</div>
                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="flex items-center gap-1 text-[9px]"><MessageSquare className="w-3 h-3" /> 12</div>
                    <div className="flex items-center gap-1 text-[9px]"><Paperclip className="w-3 h-3" /> 3</div>
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-sm opacity-60">
                  <div className="h-2 w-12 bg-zinc-100 dark:bg-zinc-700 rounded-full mb-3" />
                  <div className="h-4 w-full bg-zinc-50 dark:bg-zinc-700/50 rounded-lg" />
                </div>
              </div>
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}

// ── Bento Grid ────────────────────────────────────────────────────────────────

function BentoGrid() {
  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <div className="mb-20">
        <SectionLabel>features_engine</SectionLabel>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Une architecture pensée pour <br />
          <span className="text-zinc-400">la clarté.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[340px]">

        {/* Kanban */}
        <div className="md:col-span-8 bento-card relative overflow-hidden bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-between group">
          <div>
            <LayoutGrid className="w-8 h-8 mb-6 text-zinc-900 dark:text-white" />
            <h3 className="text-2xl font-bold mb-4 dark:text-white">Flux de travail sans friction</h3>
            <p className="text-zinc-500 max-w-md">Drag-and-drop intuitif, statuts personnalisables et filtres puissants pour garder le cap sur vos priorités.</p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-40 group-hover:opacity-100 transition-opacity">
            <div className="w-64 h-48 bg-zinc-50 dark:bg-zinc-800 rounded-tl-3xl border-t border-l border-zinc-200 dark:border-white/5 p-6 space-y-4">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
              <div className="space-y-2">
                <div className="h-10 w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/5 shadow-sm" />
                <div className="h-10 w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/5 shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="md:col-span-4 bento-card bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6">
            <MessageSquare className="w-6 h-6 text-zinc-900 dark:text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">Chat en temps réel</h3>
            <p className="text-zinc-500 text-sm">Messagerie instantanée par workspace. Finissez-en avec les fils d&apos;emails interminables.</p>
          </div>
        </div>

        {/* Files */}
        <div className="md:col-span-4 bento-card bg-zinc-900 dark:bg-white rounded-[2.5rem] p-10 flex flex-col justify-between text-white dark:text-zinc-900">
          <Files className="w-10 h-10 mb-6 opacity-80" />
          <div>
            <h3 className="text-xl font-bold mb-3">Gestion de fichiers</h3>
            <p className="opacity-60 text-sm">Upload, prévisualisation et archivage. Tout le contexte du projet au même endroit.</p>
          </div>
        </div>

        {/* Workspace roles */}
        <div className="md:col-span-8 bento-card relative overflow-hidden bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-between">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1">
              <Users className="w-8 h-8 mb-6 text-zinc-900 dark:text-white" />
              <h3 className="text-2xl font-bold mb-4 dark:text-white">Workspace isolé</h3>
              <p className="text-zinc-500">Chaque client vit dans son propre espace sécurisé. Administrez les rôles et permissions avec une précision chirurgicale.</p>
            </div>
            <div className="flex-1 flex flex-col gap-3 justify-center">
              {[
                { label: 'Admin (Vous)', active: true },
                { label: 'Designer (Invité)', active: false },
                { label: 'Client (Vue restreinte)', active: false },
              ].map(({ label, active }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider dark:text-zinc-200">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── How It Works (slide-over card) ────────────────────────────────────────────

function HowItWorks({ cardRef }: { cardRef?: RefObject<HTMLElement | null> }) {
  return (
    <section
      ref={cardRef}
      className="how-it-works-card h-full py-40 px-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 relative overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <SectionLabel className="!text-zinc-500">workflow_guide</SectionLabel>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-10 leading-[1.1]">
              De l&apos;idée à la livraison en<br />
              <span className="italic font-medium opacity-50">trois clics.</span>
            </h2>
            <CTAButton variant="secondary" className="!border-white/20 dark:!border-zinc-200 !text-white dark:!text-zinc-900">
              En savoir plus
            </CTAButton>
          </div>

          <div className="space-y-16">
            {[
              { n: '01', t: 'Workspace', d: "Créez votre environnement et personnalisez-le selon les besoins de votre projet." },
              { n: '02', t: 'Client',    d: "Invitez vos parties prenantes. Ils accèdent uniquement à ce que vous décidez." },
              { n: '03', t: 'Succès',    d: "Suivez le progrès en temps réel et validez les étapes clés sans friction." },
            ].map((step) => (
              <div key={step.n} className="flex gap-8 group">
                <div className="text-4xl font-geist-mono font-bold opacity-20 group-hover:opacity-100 transition-opacity">{step.n}</div>
                <div>
                  <h4 className="text-2xl font-bold mb-3">{step.t}</h4>
                  <p className="opacity-50 text-lg">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const snapState = useRef<'below' | 'snapped'>('below')
  const overflowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      const wrapper = sectionRef.current
      const card = cardRef.current
      if (!wrapper || !card) return

      const { top } = wrapper.getBoundingClientRect()
      const progress = -top / window.innerHeight

      if (progress > 0.03 && snapState.current === 'below') {
        snapState.current = 'snapped'
        card.classList.remove('how-snap-down')
        card.classList.add('how-snap-up')
        document.body.style.overflow = 'hidden'
        if (overflowTimer.current) clearTimeout(overflowTimer.current)
        overflowTimer.current = setTimeout(() => { document.body.style.overflow = '' }, 950)
      }

      if (progress < 0.01 && snapState.current === 'snapped') {
        snapState.current = 'below'
        card.classList.remove('how-snap-up')
        card.classList.add('how-snap-down')
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (overflowTimer.current) clearTimeout(overflowTimer.current)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="min-h-screen selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 font-sans text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
      <style>{styleTag}</style>
      <Background />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-[100] px-6 py-6 md:py-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-[14px] flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-[15deg]">
              <Zap className="w-6 h-6 text-white dark:text-zinc-900 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">Sparkhub</span>
          </div>

          <div className="hidden lg:flex items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/5 rounded-2xl px-8 py-3 gap-10 shadow-sm">
            {['Produit', 'Solution', 'Tarifs'].map((link) => (
              <a key={link} href="#" className="font-geist-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a href="/login" className="hidden sm:block font-geist-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-4">
              Login
            </a>
            <CTAButton variant="primary" className="!px-6 !py-3">Démarrer</CTAButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-44 pb-32 px-6">
        <div className="max-w-6xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/5 rounded-full mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="font-geist-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Sparkhub v2.4 est en ligne</span>
            <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <a href="#" className="font-geist-mono text-[9px] uppercase tracking-[0.25em] text-zinc-900 dark:text-white font-bold hover:underline">Lire le patch</a>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-[100px] font-bold tracking-tight mb-10 leading-[0.95] dark:text-white">
            Travaillez mieux,<br />
            <span className="text-zinc-400 italic font-medium">pas plus fort.</span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-14 leading-relaxed font-medium">
            La plateforme de gestion de projets qui fusionne agences et clients dans un espace de travail parfaitement orchestré.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <CTAButton variant="primary" className="!px-10 !py-5 !text-sm">
              Créer un espace gratuit <ArrowRight className="w-4 h-4" />
            </CTAButton>
            <CTAButton variant="secondary" className="!px-10 !py-5 !text-sm">Réserver une démo</CTAButton>
          </div>
        </div>

        <DashboardPreview />
      </section>

      {/* Social proof */}
      <section className="py-20 border-y border-zinc-200 dark:border-white/5 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-geist-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400 text-center mb-12 font-bold">
            Propulsé par les meilleures agences
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all">
            <div className="font-bold text-2xl tracking-tighter italic">AURORA</div>
            <div className="font-bold text-2xl tracking-widest uppercase">Zénith</div>
            <div className="font-bold text-2xl tracking-tighter">NEXUS.</div>
            <div className="font-bold text-2xl italic tracking-tight underline">Studio_X</div>
          </div>
        </div>
      </section>

      {/* 300vh scroll section: BentoGrid stays sticky, HowItWorks slides over */}
      <div ref={sectionRef} className="relative" style={{ height: '300vh' }}>
        {/* BentoGrid: sticky behind, visible for the full 300vh range */}
        <div className="sticky top-0 h-screen overflow-hidden z-10">
          <BentoGrid />
        </div>
        {/* HowItWorks: same sticky range, starts 30px visible at bottom → snaps up */}
        <div className="sticky top-0 h-screen overflow-hidden z-20" style={{ marginTop: '-100vh' }}>
          <HowItWorks cardRef={cardRef} />
        </div>
      </div>

      {/* Testimonial */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-10 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Zap key={i} className="w-5 h-5 text-zinc-900 dark:text-white fill-current" />
            ))}
          </div>
          <blockquote className="text-3xl md:text-5xl font-medium tracking-tight mb-12 dark:text-zinc-100 leading-tight">
            &quot;Sparkhub a réduit nos échanges par email de 80 %. C&apos;est l&apos;outil le plus propre et le plus efficace que nous ayons utilisé en 10 ans d&apos;agence.&quot;
          </blockquote>
          <div>
            <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 border-4 border-white dark:border-zinc-900 shadow-xl" />
            <p className="font-bold dark:text-white">Thomas Chevalier</p>
            <p className="font-geist-mono text-[10px] uppercase tracking-widest text-zinc-400">Directeur de Création @ AURORA</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6 relative z-10">
        <div className="max-w-7xl mx-auto bg-[#09090b] dark:bg-white rounded-[4rem] p-12 md:p-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 noise opacity-5 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter text-white dark:text-zinc-900 mb-10">
              Prêt à accélérer ?
            </h2>
            <p className="text-zinc-400 dark:text-zinc-500 text-xl max-w-xl mx-auto mb-16">
              Rejoignez des milliers de professionnels qui orchestrent leur collaboration client dès aujourd&apos;hui.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <CTAButton variant="primary" className="!bg-white dark:!bg-zinc-900 !text-zinc-900 dark:!text-white !px-12 !py-6 !text-sm">
                Essayer gratuitement
              </CTAButton>
              <span className="font-geist-mono text-[10px] uppercase tracking-[0.3em] text-white/50 dark:text-zinc-400">
                Aucune carte requise
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-zinc-200 dark:border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-20">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-6 h-6 fill-current dark:text-white" />
                <span className="text-2xl font-black tracking-tighter uppercase italic dark:text-white">Sparkhub</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                La nouvelle norme de collaboration pour les agences et freelances modernes.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
              {[
                { t: 'Produit',   l: ['Fonctionnalités', 'Sécurité', 'Tarifs'] },
                { t: 'Compagnie', l: ['À propos', 'Blog', 'Carrières'] },
                { t: 'Légal',     l: ['Confidentialité', 'Cookies', 'Mentions'] },
              ].map((group) => (
                <div key={group.t}>
                  <h5 className="font-geist-mono text-[10px] uppercase tracking-[0.3em] font-bold mb-6 dark:text-zinc-400">{group.t}</h5>
                  <ul className="space-y-4">
                    {group.l.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm transition-colors">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-zinc-100 dark:border-white/5 gap-6">
            <p className="font-geist-mono text-[9px] uppercase tracking-widest text-zinc-400">© 2024 SPARKHUB TECHNOLOGIES INC.</p>
            <div className="flex gap-8">
              <a href="#" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Search className="w-4 h-4" /></a>
              <a href="#" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Zap className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
