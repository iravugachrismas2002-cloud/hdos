// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, BriefcaseBusiness, Check, Compass, FileCheck2, GraduationCap, Menu, ShieldCheck, Sparkles, Target } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const engines = [
  { icon: Target, name: "Goal Engine", text: "Turn your ambition into a practical plan with milestones you can track." },
  { icon: BarChart3, name: "Workforce Intelligence", text: "Explore Rwanda occupations, skills and evidence behind the trends." },
  { icon: Compass, name: "Opportunity Intelligence", text: "Discover jobs, scholarships and training from clearly named sources." },
  { icon: FileCheck2, name: "Application Portal", text: "Check requirements, prepare documents and keep your applications together." },
];

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden bg-[#070b12] text-white selection:bg-cyan-300/30">
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <BrandLogo className="w-24 rounded-xl bg-white p-1.5 sm:w-28" />
      <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
        <a href="#platform" className="hover:text-white">Platform</a><a href="#how" className="hover:text-white">How it works</a><a href="#evidence" className="hover:text-white">Our approach</a>
      </nav>
      <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Sign in</Link><Link href="/register" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">Build my pathway <ArrowRight className="ml-1 inline" size={15}/></Link></div>
    </header>

    <section className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute -left-40 top-5 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]"/><div className="pointer-events-none absolute right-0 top-24 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[110px]"/>
      <div className="relative z-[1]">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[.07] px-3.5 py-2 text-xs font-semibold tracking-wide text-cyan-100"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> RWANDA OPPORTUNITY INTELLIGENCE</div>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-6xl lg:text-[72px]">Make your next step <span className="bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">clear.</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">HDOS helps you connect your goals, skills and education to pathways, opportunities and practical actions across Rwanda.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/register" className="rounded-xl bg-cyan-300 px-6 py-3.5 font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-200">Build my pathway <ArrowRight className="ml-2 inline" size={17}/></Link><Link href="/login" className="rounded-xl border border-white/15 bg-white/[.04] px-6 py-3.5 font-semibold text-white hover:bg-white/10">Sign in <ArrowUpRight className="ml-2 inline" size={16}/></Link></div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400"><span><Check className="mr-1.5 inline text-emerald-300" size={15}/>Explainable recommendations</span><span><Check className="mr-1.5 inline text-emerald-300" size={15}/>Source-aware opportunity data</span></div>
      </div>
      <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
        <div className="absolute -inset-5 rounded-[32px] bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-violet-500/15 blur-2xl"/>
        <div className="relative rounded-[28px] border border-white/10 bg-[#0d1420]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-7">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.18em] text-cyan-200">YOUR COMMAND CENTRE</p><p className="mt-2 text-xl font-semibold">A pathway that moves with you</p></div><Sparkles className="text-cyan-200" size={21}/></div>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center justify-between text-sm"><span className="font-medium">Career pathway</span><span className="text-cyan-200">In progress</span></div><div className="mt-4 flex items-center gap-2">{["Goal", "Skills", "Training", "Opportunity"].map((step,i)=><div className="flex flex-1 flex-col gap-2" key={step}><div className="flex items-center"><span className={`h-2.5 w-2.5 rounded-full ${i<2?"bg-cyan-300":"bg-slate-600"}`}/><span className="h-px flex-1 bg-white/10"/></div><span className="text-[11px] text-slate-400">{step}</span></div>)}</div></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><GraduationCap className="text-violet-200" size={19}/><p className="mt-4 text-2xl font-semibold">Study</p><p className="mt-1 text-xs text-slate-400">Explore learning paths</p></div><div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><BriefcaseBusiness className="text-cyan-200" size={19}/><p className="mt-4 text-2xl font-semibold">Work</p><p className="mt-1 text-xs text-slate-400">Find relevant opportunities</p></div></div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.06] p-4"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-200" size={18}/><p className="text-sm leading-6 text-slate-300">Recommendations show their evidence. You stay in control of your profile and applications.</p></div>
        </div>
      </div>
    </section>

    <section id="platform" className="border-y border-white/[.07] bg-white/[.02] px-5 py-20 lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold tracking-[.2em] text-cyan-200">ONE CONNECTED PLATFORM</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Intelligence that turns into action.</h2><p className="max-w-md text-sm leading-6 text-slate-400">Build a profile once, understand your options and keep your next steps in view.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{engines.map(({icon:Icon,name,text},i)=><article key={name} className="group rounded-2xl border border-white/10 bg-[#0b111b] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-[#101b29]"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Icon size={21}/></span><span className="text-xs font-semibold text-slate-600">0{i+1}</span></div><h3 className="mt-6 text-lg font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>)}</div></div></section>

    <section id="how" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8"><div><p className="text-xs font-bold tracking-[.2em] text-cyan-200">HOW IT WORKS</p><h2 className="mt-4 text-3xl font-semibold sm:text-4xl">A clear journey, one step at a time.</h2><p className="mt-4 max-w-lg leading-7 text-slate-400">HDOS brings your goals and relevant public information together, then helps you act on what you learn.</p><Link href="/register" className="mt-7 inline-flex items-center font-semibold text-cyan-200 hover:text-white">Start building your pathway <ArrowRight className="ml-2" size={16}/></Link></div><ol className="grid gap-3 sm:grid-cols-2">{[{n:"01",t:"Set a goal",d:"Tell HDOS what you want to work toward."},{n:"02",t:"Build your profile",d:"Add education, skills and experience at your pace."},{n:"03",t:"Explore your options",d:"Review pathways and opportunities with clear sources."},{n:"04",t:"Track progress",d:"Turn decisions into milestones and applications."}].map(x=><li key={x.n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5"><span className="font-mono text-sm text-cyan-200">{x.n}</span><div><h3 className="font-semibold">{x.t}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{x.d}</p></div></li>)}</ol></section>

    <section id="evidence" className="mx-5 mb-20 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#101c2b] to-[#0b1018] px-6 py-10 sm:px-10 lg:mx-auto lg:max-w-7xl lg:py-14"><div className="grid items-center gap-8 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold tracking-[.2em] text-cyan-200">BUILT FOR CLARITY</p><h2 className="mt-3 text-2xl font-semibold sm:text-3xl">You should know why a recommendation appears.</h2><p className="mt-3 max-w-2xl leading-7 text-slate-400">HDOS uses structured data and explainable scoring for pathway recommendations. AI can help explain and guide, while sources and eligibility details remain visible for you to review.</p></div><Link href="/register" className="rounded-xl bg-white px-5 py-3 text-center font-bold text-slate-950 hover:bg-cyan-100">Get started <ArrowRight className="ml-2 inline" size={16}/></Link></div></section>

    <footer className="border-t border-white/[.08] px-5 py-8 text-center text-sm text-slate-500"><p>HDOS Rwanda™ · Independent opportunity intelligence platform</p><p className="mt-2">© 2026 HDOS Rwanda. All rights reserved.</p></footer>
  </main>;
}
