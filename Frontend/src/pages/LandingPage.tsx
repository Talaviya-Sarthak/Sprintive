"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Mic,
  FileText,
  Bot,
  CheckSquare,
  Kanban,
  Rocket,
  ChevronDown,
  Star,
  Zap,
  ShieldCheck,
  ChevronRight,
  Check,
} from "lucide-react";
import GlyphPortal from "../components/ui/glyph-portal";
import TextBlockAnimation from "../components/ui/text-block-animation";
import { cn } from "@/lib/utils";

const family = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * TiltedSheetSection:
 * - Sharp rectangle edge (rounded-none).
 * - Previous section stays pinned in place.
 * - New section comes out from right-bottom at a tilted angle (-8°).
 * - Once it reaches half Y in height (~0.45), it straightens to 0° and smoothly covers the previous section.
 */
function TiltedSheetSection({
  children,
  className = "",
  style,
  zIndex = 20,
  bg = "#09090b",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  bg?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      data-flow-section
      className="relative min-h-screen w-full overflow-hidden bg-transparent"
      style={{ zIndex }}
    >
      <div
        data-flow-inner
        className={cn(
          "flow-art-container relative min-h-screen w-full will-change-transform shadow-none rounded-none",
          className
        )}
        style={{
          transformOrigin: "bottom left",
          backgroundColor: bg,
          ...style,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [face, setFace] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingAnnual, setBillingAnnual] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const hero = heroRef.current;
      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-flow-section]")
      );
      if (sections.length === 0) return;

      const triggers: ScrollTrigger[] = [];

      // Pin hero when its bottom reaches viewport bottom so Section 2 sweeps over it
      if (hero) {
        triggers.push(
          ScrollTrigger.create({
            trigger: hero,
            start: "bottom bottom",
            end: "bottom top",
            pin: true,
            pinSpacing: false,
          })
        );
      }

      // Incoming sections rotate in from bottom-right (30 deg -> 0 deg)
      sections.forEach((section, i) => {
        gsap.set(section, { zIndex: (i + 2) * 10 });

        const inner = section.querySelector<HTMLElement>(".flow-art-container");
        if (!inner) return;

        gsap.set(inner, { rotation: 30, transformOrigin: "bottom left" });
        const tween = gsap.to(inner, {
          rotation: 0,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "top 25%",
            scrub: true,
          },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);

        // Previous section pins until covered
        if (i < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "bottom bottom",
              end: "bottom top",
              pin: true,
              pinSpacing: false,
            })
          );
        }
      });

      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);

      return () => {
        clearTimeout(timer);
        triggers.forEach((t) => t.kill());
      };
    },
    { scope: containerRef, dependencies: [face] }
  );

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => setFace(family)).catch(() => setFace("sans-serif"));
    } else {
      setFace("sans-serif");
    }
  }, []);

  const pipelineSteps = [
    {
      num: "01",
      title: "MEETING CREATED",
      desc: "Launch standups, planning, or retros in 1-click.",
      icon: Calendar,
      graphic: (
        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-none bg-black/10 border border-black/10">
          <span className="w-4 h-4 rounded-full bg-[#EA580C] text-[9px] font-bold text-white flex items-center justify-center">
            A
          </span>
          <span className="w-4 h-4 rounded-full bg-[#3F3F46] text-[9px] font-bold text-white flex items-center justify-center">
            B
          </span>
          <span className="w-4 h-4 rounded-full bg-[#27272A] text-[9px] font-bold text-gray-300 flex items-center justify-center">
            C
          </span>
        </div>
      ),
    },
    {
      num: "02",
      title: "AI LISTENS",
      desc: "Real-time voice processing & noise-isolated audio stream.",
      icon: Mic,
      graphic: (
        <div className="flex items-center gap-1 py-1 px-2.5 rounded-none bg-black/10 border border-black/10 h-7">
          {[35, 70, 95, 55, 85, 40, 75, 45, 90, 30].map((h, i) => (
            <span
              key={i}
              className="w-0.5 bg-[#EA580C] rounded-none animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      ),
    },
    {
      num: "03",
      title: "LIVE TRANSCRIPT",
      desc: "Instant speaker-diarized text generated live.",
      icon: FileText,
      graphic: (
        <div className="w-24 py-1.5 px-2.5 rounded-none bg-black/10 border border-black/10 flex flex-col justify-center">
          <div className="h-1.5 w-full bg-[#EA580C] rounded-none shadow-[0_0_8px_rgba(234,88,12,0.6)] animate-pulse" />
        </div>
      ),
    },
    {
      num: "04",
      title: "AI ANALYSIS",
      desc: "Context-aware extraction of decisions & blockers.",
      icon: Bot,
      graphic: (
        <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-none bg-black/10 border border-black/10">
          <div className="w-3 h-3 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
          <span className="text-[9px] font-mono tracking-wider font-semibold text-[#EA580C]">
            ANALYZING...
          </span>
        </div>
      ),
    },
    {
      num: "05",
      title: "TASK EXTRACTION",
      titleColor: "text-[#EA580C]",
      desc: "Automatically assigned tickets with priority tags.",
      icon: CheckSquare,
      graphic: (
        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-none bg-black/10 border border-black/10">
          <div className="w-2.5 h-2.5 bg-[#EA580C] rounded-none" />
          <div className="w-2.5 h-2.5 bg-[#EA580C] rounded-none" />
          <span className="text-[9px] font-mono font-bold text-[#18181B]">TASKS</span>
        </div>
      ),
    },
    {
      num: "06",
      title: "KANBAN UPDATED",
      desc: "Sprint board syncs instantly without manual entry.",
      icon: Kanban,
      graphic: (
        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-none bg-black/10 border border-black/10">
          <div className="w-5 h-2.5 bg-black/20 rounded-none" />
          <div className="w-4 h-2 bg-[#EA580C] rounded-none" />
        </div>
      ),
    },
    {
      num: "07",
      title: "SPRINT READY",
      desc: "Clear goals, automated insights, and team alignment.",
      icon: Rocket,
      graphic: (
        <div className="flex items-center gap-1.5 py-1 px-3 rounded-none bg-[#14532d] border border-[#22c55e]/40 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-ping" />
          <span className="text-[9px] font-mono font-bold text-white tracking-wide">
            100% SYNCED
          </span>
        </div>
      ),
    },
  ];

  const faqs = [
    {
      q: "How does Sprintive's 13-agent AI pipeline work?",
      a: "During and after your meeting, Sprintive's multi-agent orchestrator passes audio transcripts through 13 specialized micro-agents: noise reduction, speaker attribution, technical entity resolution, decision isolation, task breakdown, acceptance criteria synthesis, and automatic Kanban ticket delivery.",
    },
    {
      q: "Can I connect my real-time voice and video meetings?",
      a: "Yes! Sprintive includes a built-in low-latency WebRTC meeting room with live Deepgram speech transcription. You can also upload pre-recorded meeting audio/video files directly to your dashboard.",
    },
    {
      q: "How accurate is the technical task extraction?",
      a: "Because the pipeline uses specialized agents specifically tuned for software engineering terminology (PRs, APIs, endpoints, bug reports, and sprint epics), tasks are generated with concrete acceptance criteria and assigned to specific team members.",
    },
    {
      q: "Does it integrate directly into an interactive Kanban board?",
      a: "Yes! Sprintive includes a full-featured real-time Kanban board with customizable columns (To Do, In Progress, In Review, Done), drag-and-drop mechanics, priority badges, and deep links back to the exact meeting timestamp.",
    },
    {
      q: "Is our proprietary engineering conversation data secure?",
      a: "Absolutely. All WebRTC audio streams and transcript data are encrypted end-to-end. Your organization's data is isolated in secure workspaces and is never used to train public machine learning models.",
    },
  ];

  return (
    <div
      data-landing-root
      className="w-full bg-[#08080a] text-zinc-100 overflow-x-clip selection:bg-[#EA580C]/20 selection:text-[#EA580C]"
      style={{
        fontFamily: face ?? "sans-serif",
      }}
    >
      <style>{`
        /* Position caption and enter button exactly matching reference Image 1 */
        [data-landing-root] [data-gp-caption] {
          position: absolute;
          inset: auto auto auto 50%;
          top: calc(var(--gp-word-bottom, 50%) + 62px);
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          margin: 0;
          padding: 0;
        }
        [data-landing-root] [data-gp-hint] {
          display: none;
        }
        [data-landing-root] [data-gp-enter] {
          min-height: 42px;
          padding: 0 22px;
          gap: 12px;
          background: #180d07;
          border: 1px solid #100804;
          border-radius: 9999px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 2px 10px rgba(24, 13, 7, 0.2);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, box-shadow 0.2s;
          cursor: pointer;
          text-decoration: none;
        }
        [data-landing-root] [data-gp-enter]:hover {
          background: #000000;
          box-shadow: 0 4px 16px rgba(24, 13, 7, 0.35);
          transform: translateY(-1px);
        }
        [data-landing-root] [data-gp-enter]:focus-visible {
          outline: 2px solid #EA580C;
          outline-offset: 4px;
        }
        [data-landing-root] [data-gp-enter] span {
          font-size: 13px;
          transition: transform 0.2s ease;
        }
        [data-landing-root] [data-gp-enter]:hover span {
          transform: translate(2px, 2px);
        }

        /* Top Header Navigation */
        [data-hero-header] {
          position: absolute;
          inset: clamp(18px, 3.2vw, 36px) clamp(24px, 4vw, 56px) auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 30;
          pointer-events: auto;
        }
        [data-hero-brand] {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #111827;
          text-decoration: none;
        }
        [data-hero-tagline] {
          font-size: 12.5px;
          font-weight: 400;
          color: #6b7280;
          letter-spacing: -0.01em;
        }

        /* Eyebrow positioned precisely above SPRINTIVE */
        [data-hero-eyebrow] {
          position: absolute;
          inset: auto auto calc(100% - var(--gp-word-top, 38%) + 24px) 50%;
          transform: translateX(-50%);
          margin: 0;
          text-align: center;
          font-size: 13.5px;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: #555555;
          white-space: nowrap;
          pointer-events: none;
        }

        /* Support text positioned under SPRINTIVE */
        [data-hero-support] {
          position: absolute;
          inset: calc(var(--gp-word-bottom, 54%) + 22px) auto auto 50%;
          transform: translateX(-50%);
          margin: 0;
          text-align: center;
          font-size: 14.5px;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: #555555;
          white-space: nowrap;
          pointer-events: none;
        }

        /* Bottom scroll invitation */
        [data-hero-scroll] {
          position: absolute;
          inset: auto auto 26px 50%;
          transform: translateX(-50%);
          text-align: center;
          color: #888888;
          font-size: 11.5px;
          letter-spacing: 0.02em;
          white-space: nowrap;
          pointer-events: none;
        }

        /* Reveal Section inside the orange field - black fonts & sharp rectangle */
        [data-landing-root] [data-gp-content] {
          padding: clamp(3rem, 8vw, 7rem) clamp(1.5rem, 6vw, 6rem);
          font-family: inherit;
          color: #000000;
        }
        [data-portal-inner] {
          width: min(100%, 78rem);
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: clamp(2.5rem, 5vw, 4.5rem);
          color: #000000;
        }
        [data-portal-inner] h2 {
          max-width: 44rem;
          margin: 0;
          color: #000000;
          font-size: clamp(2.2rem, 1.5rem + 2.8vw, 3.8rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.035em;
        }
        [data-portal-grid] {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          width: 100%;
        }
        @media(min-width: 768px) {
          [data-portal-grid] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2rem;
          }
        }
        [data-portal-card] {
          background: rgba(255, 255, 255, 0.22);
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 0px;
          padding: 2rem;
          backdrop-filter: blur(14px);
          transition: transform 0.25s, border-color 0.25s, background-color 0.25s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }
        [data-portal-card]:hover {
          background: rgba(255, 255, 255, 0.32);
          border-color: rgba(0, 0, 0, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        [data-portal-no] {
          display: inline-block;
          font-family: ui-monospace, monospace;
          font-size: 0.85rem;
          font-weight: 800;
          color: #000000;
          letter-spacing: 0.08em;
          margin-bottom: 1rem;
        }
        [data-portal-card] h3 {
          margin: 0 0 0.75rem;
          color: #000000;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        [data-portal-card] p {
          margin: 0;
          color: #111827;
          font-size: 0.95rem;
          line-height: 1.6;
          font-weight: 450;
        }

        /* Continuous Animated Pipeline Conduit */
        @keyframes pipelineFlow {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        @keyframes packetMove {
          0% {
            left: 0%;
            opacity: 0;
            transform: translateY(-50%) scale(0.6);
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
            transform: translateY(-50%) scale(1.2);
          }
        }

        .pipeline-conduit-glow {
          background: linear-gradient(
            90deg,
            #ea580c 0%,
            #f97316 25%,
            #fb923c 50%,
            #ea580c 75%,
            #c2410c 100%
          );
          background-size: 200% 100%;
          animation: pipelineFlow 3s linear infinite;
        }

        .data-packet {
          position: absolute;
          top: 50%;
          width: 24px;
          height: 6px;
          background: #ea580c;
          border-radius: 9999px;
          box-shadow: 0 0 16px #ea580c, 0 0 32px #f97316;
          animation: packetMove 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
        }

        .data-packet-2 {
          animation-delay: 1.2s;
        }

        .data-packet-3 {
          animation-delay: 2.4s;
        }
      `}</style>

      {face ? (
        <div ref={containerRef} className="relative w-full">
          {/* =========================================================================
              SECTION 1: THE INITIAL LANDING ANIMATION (GlyphPortal Zoom into Orange)
              Restored exactly: SPRINTIVE scales up continuously as you scroll
              ========================================================================= */}
          <div ref={heroRef} className="relative w-full z-10">
            <GlyphPortal
              word="SPRINTIVE"
              focusChar="I"
              fontFamily={face}
              fontWeight={900}
              scrollLength={2.6}
              interactive={true}
              annotations={false}
              enterLabel="Step inside"
              style={{
                "--gp-paper": "#FFFFFF",
                "--gp-ink": "#EA580C",
                "--gp-field": "#EA580C",
                "--gp-foreground": "#000000",
              }}
              background={
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: "scale(var(--gp-field-scale, 1))",
                    background:
                      "radial-gradient(circle at 18% 12%, rgba(251, 146, 60, 0.5), transparent 45%), radial-gradient(circle at 82% 24%, rgba(255, 255, 255, 0.15), transparent 38%), linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #9A3412 100%)",
                  }}
                />
              }
              front={
                <>
                  {/* Top Header Navigation */}
                  <div data-hero-header>
                    <span data-hero-brand>sprintive.</span>

                    <div className="flex items-center gap-4">
                      <span data-hero-tagline className="hidden sm:inline">
                        Design &amp; digital sprint intelligence
                      </span>
                      <Link
                        to="/login"
                        className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:text-black hover:border-gray-500 transition-colors"
                      >
                        Sign In
                      </Link>
                    </div>
                  </div>

                  {/* Eyebrow positioned precisely above SPRINTIVE */}
                  <p data-hero-eyebrow>A different perspective starts here.</p>

                  {/* Subtitle positioned precisely below SPRINTIVE */}
                  <p data-hero-support>Follow your curiosity.</p>

                  {/* Bottom scroll invitation */}
                  <span data-hero-scroll>Scroll for a closer look ↓</span>
                </>
              }
            >
              {/* Content revealed inside the orange ink field (Mailora-inspired: big heading on left, paragraph & CTA on right) */}
              <div className="w-full min-h-[85vh] flex flex-col justify-between py-10 px-6 sm:px-12 md:px-16 text-white max-w-[1400px] mx-auto">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-black/70 pb-4">
                  <span>Sprintive Intelligence</span>
                  <span>Autonomous Agile Platform</span>
                </div>

                <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end py-8">
                  <div className="lg:col-span-8">
                    <h1 className="text-[clamp(3.5rem,8.5vw,9.5rem)] font-black leading-[0.82] uppercase tracking-tighter text-white drop-shadow-sm">
                      Sprint
                      <br />
                      Without
                      <br />
                      Limits
                    </h1>
                  </div>

                  <div className="lg:col-span-4 flex flex-col justify-end gap-6 pb-2">
                    <p className="text-base sm:text-lg lg:text-xl font-normal leading-relaxed text-white">
                      We believe engineering teams deserve sprint intelligence that cuts through the noise. Sprintive synthesizes raw meeting dialogue into actionable backlog cards — connected directly to your developer workflows.
                    </p>
                    <div>
                      <button
                        onClick={() => navigate("/signup")}
                        className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-black text-white hover:bg-neutral-900 font-bold text-sm tracking-wide transition shadow-xl cursor-pointer group"
                      >
                        <span>Start Sprinting</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/20 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-black/70">
                  <span>Direct Deepgram Voice Intelligence</span>
                  <span>Zero Manual Backlog Drag</span>
                </div>
              </div>
            </GlyphPortal>
          </div>

          {/* =========================================================================
              SECTION 2: THE MISSION / ABOUT
              Comes from right-bottom at 30° tilt, straightens to 0° and covers Section 1
              Unified Brand Orange (#EA580C) matching the landing zoom portal
              ========================================================================= */}
          <TiltedSheetSection
            id="mission-sheet"
            zIndex={20}
            bg="#09090b"
            className="text-white py-24 px-6 md:px-14 flex flex-col justify-center"
          >
            <div className="max-w-6xl mx-auto w-full space-y-12">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                  02 — THE MISSION
                </span>
                <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                  <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] text-white">
                    BUILD FIRST.<br />
                    ALWAYS.
                  </h2>
                </TextBlockAnimation>
              </div>

              <div className="max-w-3xl space-y-4">
                <p className="text-base md:text-2xl text-zinc-300 font-normal leading-relaxed">
                  A software intelligence platform built for engineering teams, by engineers.
                  We&apos;re rewriting the rules of how sprint discussions become production code.
                </p>
              </div>

              {/* 3 Pillars Grid with premium rounded corners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                <div className="p-6 bg-white/[0.04] border border-white/10 space-y-3 rounded-2xl hover:border-[#EA580C]/40 transition-colors">
                  <h4 className="text-xs font-mono font-bold tracking-widest text-[#EA580C] uppercase">
                    DISCOVERY
                  </h4>
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                    AI-curated meeting synthesis that captures actual technical architecture. No fluff, no lost context.
                  </p>
                </div>

                <div className="p-6 bg-white/[0.04] border border-white/10 space-y-3 rounded-2xl hover:border-[#EA580C]/40 transition-colors">
                  <h4 className="text-xs font-mono font-bold tracking-widest text-[#EA580C] uppercase">
                    VELOCITY
                  </h4>
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                    Eliminate hours spent manually drafting Jira and Kanban tickets after standups.
                  </p>
                </div>

                <div className="p-6 bg-white/[0.04] border border-white/10 space-y-3 rounded-2xl hover:border-[#EA580C]/40 transition-colors">
                  <h4 className="text-xs font-mono font-bold tracking-widest text-[#EA580C] uppercase">
                    TRACEABILITY
                  </h4>
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                    Every backlog ticket links directly back to speaker attributions and verifiable meeting timestamps.
                  </p>
                </div>
              </div>

              {/* Real Metrics Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                <div>
                  <div className="text-3xl md:text-4xl font-black text-[#EA580C] font-mono">100%</div>
                  <div className="text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                    Autonomous Synthesis
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-black text-[#EA580C] font-mono">&lt;60s</div>
                  <div className="text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                    Post-Call Processing
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-black text-[#EA580C] font-mono">13</div>
                  <div className="text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                    Specialized AI Agents
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-black text-[#EA580C] font-mono">0 min</div>
                  <div className="text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                    Manual Ticket Writing
                  </div>
                </div>
              </div>
            </div></TiltedSheetSection>

          {/* =========================================================================
              SECTION 3: HOW IT WORKS / AI PIPELINE
              Comes from right-bottom at -8° tilt, reaches half Y, straightens to 0° and covers Section 2
              Warm Cream (#F5F2EB) with live transmitting pipeline data
              ========================================================================= */}
          <TiltedSheetSection
            id="how-it-works-sheet"
            zIndex={30}
            bg="#F5F2EB"
            className="text-[#18181B] py-24 px-4 sm:px-8 md:px-14 flex flex-col justify-center"
          >
            <div className="max-w-[1440px] mx-auto w-full space-y-12">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                  03 — HOW IT WORKS
                </span>
                <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                  <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#18181B] uppercase leading-none">
                    SPRINT IN<br />
                    MINUTES.
                  </h2>
                </TextBlockAnimation>
                <p className="text-xs md:text-sm text-zinc-600 font-medium max-w-xl">
                  Every feature we build starts with one question — how fast does spoken dialogue become prioritized, actionable software?
                </p>
              </div>

              {/* Live Transmitting Data Pipeline Conduit (No cards, pure live stream) */}
              <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-none">
                <div className="min-w-[1040px] relative px-2">
                  {/* Central Pipeline Line */}
                  <div className="absolute top-[82px] left-8 right-8 h-1 bg-zinc-300 rounded-none z-0 overflow-hidden">
                    <div className="w-full h-full pipeline-conduit-glow opacity-90" />
                    <div className="data-packet" />
                    <div className="data-packet data-packet-2" />
                    <div className="data-packet data-packet-3" />
                  </div>

                  {/* 7 Stage Stations */}
                  <div className="grid grid-cols-7 gap-4 relative z-10">
                    {pipelineSteps.map((step, index) => {
                      const Icon = step.icon;
                      return (
                        <div
                          key={step.num}
                          className="flex flex-col items-center text-center group"
                        >
                          {/* Stage Number */}
                          <div className="mb-3 flex items-center gap-1">
                            <span className="text-[11px] font-mono font-bold text-[#EA580C]">
                              STAGE {step.num}
                            </span>
                          </div>

                          {/* Central Glowing Transmission Hub Node */}
                          <div className="relative mb-6">
                            <div className="w-14 h-14 rounded-none bg-white border-2 border-[#EA580C] text-[#EA580C] flex items-center justify-center shadow-[0_4px_20px_rgba(234,88,12,0.25)] group-hover:scale-110 group-hover:shadow-[0_4px_28px_rgba(234,88,12,0.45)] transition-all cursor-pointer">
                              <Icon size={20} className="stroke-[2.2]" />
                            </div>
                            {index < pipelineSteps.length - 1 && (
                              <div className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 z-20 text-[#EA580C]/70">
                                <ChevronRight size={14} className="animate-pulse" />
                              </div>
                            )}
                          </div>

                          {/* Station Title */}
                          <h4
                            className={`text-xs font-black tracking-wider uppercase mb-1.5 leading-snug ${
                              step.titleColor ? step.titleColor : "text-[#18181B]"
                            }`}
                          >
                            {step.title}
                          </h4>

                          {/* Station Description */}
                          <p className="text-[11px] text-zinc-600 font-normal leading-relaxed max-w-[140px] mb-3">
                            {step.desc}
                          </p>

                          {/* Dynamic Telemetry Indicator */}
                          <div className="flex items-center justify-center min-h-[34px]">
                            {step.graphic}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TiltedSheetSection>

          {/* =========================================================================
              SECTION 4: TRANSPARENT PRICING
              Comes from right-bottom at -8° tilt, reaches half Y, straightens to 0° and covers Section 3
              Electric Royal Blue (#1D4ED8) with full Sprintive pricing tiers
              ========================================================================= */}
          <TiltedSheetSection
            id="pricing-sheet"
            zIndex={40}
            bg="#1D4ED8"
            className="text-white py-24 px-6 md:px-14 flex flex-col justify-center"
          >
            <div className="max-w-6xl mx-auto w-full space-y-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#FED7AA] uppercase">
                    04 — TRANSPARENT PRICING
                  </span>
                  <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                    <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-none">
                      INVEST IN<br />
                      VELOCITY.
                    </h2>
                  </TextBlockAnimation>
                  <p className="text-blue-100 text-xs md:text-sm max-w-lg font-medium">
                    Simple, transparent plans designed for fast-growing engineering teams. No hidden compute fees.
                  </p>
                </div>

                {/* Annual / Monthly Toggle with sharp rectangle corners */}
                <div className="flex items-center gap-2 bg-black/25 p-1.5 rounded-none border border-white/20 self-start md:self-auto">
                  <button
                    onClick={() => setBillingAnnual(false)}
                    className={cn(
                      "text-xs font-semibold px-4 py-2 rounded-none transition-all cursor-pointer",
                      !billingAnnual ? "bg-white text-blue-900 shadow-sm" : "text-white/80 hover:text-white"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingAnnual(true)}
                    className={cn(
                      "text-xs font-semibold px-4 py-2 rounded-none transition-all flex items-center gap-1.5 cursor-pointer",
                      billingAnnual ? "bg-[#EA580C] text-white shadow-sm" : "text-white/80 hover:text-white"
                    )}
                  >
                    <span>Annual</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-none bg-white/20">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Pricing Cards with sharp rectangle borders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch text-black">
                {/* Starter Tier */}
                <div className="p-8 rounded-none bg-white border border-white/20 flex flex-col justify-between space-y-8 shadow-xl">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-black uppercase tracking-wider">Starter</h3>
                      <p className="text-xs text-zinc-600">For indie developers and small squads.</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black font-mono tracking-tight text-black">$0</span>
                      <span className="text-xs text-zinc-500 font-medium">/ month</span>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-zinc-200 text-xs md:text-sm text-zinc-700">
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Up to 5 meetings / month</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Real-time WebRTC audio conference</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Live Deepgram speech transcription</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Interactive team Kanban board</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full py-3 rounded-none border-2 border-black text-black font-bold text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-all cursor-pointer"
                  >
                    Start Free
                  </button>
                </div>

                {/* Pro Tier (Featured) */}
                <div className="p-8 rounded-none bg-[#09090B] text-white border-2 border-[#EA580C] shadow-[0_12px_40px_rgba(234,88,12,0.35)] flex flex-col justify-between space-y-8 relative">
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-none bg-[#EA580C] text-white font-mono text-[10px] font-bold tracking-widest uppercase shadow-md">
                    Most Popular
                  </div>

                  <div className="space-y-6 pt-1">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white uppercase tracking-wider">Pro Team</h3>
                      <p className="text-xs text-zinc-400">Everything needed to automate sprint velocity.</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black font-mono tracking-tight text-[#EA580C]">
                        {billingAnnual ? "$24" : "$29"}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">/ seat / month</span>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-zinc-800 text-xs md:text-sm text-zinc-200">
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span className="font-semibold text-white">Unlimited meetings &amp; transcripts</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span className="font-semibold text-white">Full 13-Agent AI task synthesis</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Automatic acceptance criteria builder</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Audio &amp; video recording upload</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Speaker diarization &amp; attribution</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full py-3.5 rounded-none bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#c2410c] shadow-[0_4px_20px_rgba(234,88,12,0.4)] transition-all cursor-pointer"
                  >
                    Start 14-Day Free Trial
                  </button>
                </div>

                {/* Enterprise Tier */}
                <div className="p-8 rounded-none bg-white border border-white/20 flex flex-col justify-between space-y-8 shadow-xl">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-black uppercase tracking-wider">Enterprise</h3>
                      <p className="text-xs text-zinc-600">Dedicated compute, custom privacy, and SLA.</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black font-mono tracking-tight text-black">Custom</span>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-zinc-200 text-xs md:text-sm text-zinc-700">
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Dedicated multi-agent pipeline instances</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Custom Jira, Linear &amp; GitHub sync</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>SAML 2.0 SSO &amp; directory sync</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#EA580C] shrink-0" />
                        <span>Zero-data-retention VPC deployment</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full py-3 rounded-none border-2 border-zinc-300 text-black font-bold text-xs uppercase tracking-wider hover:border-black transition-all cursor-pointer"
                  >
                    Contact Enterprise Sales
                  </button>
                </div>
              </div>
            </div>
          </TiltedSheetSection>

          {/* =========================================================================
              SECTION 5: SOCIAL PROOF / TESTIMONIALS
              Comes from right-bottom at -8° tilt, reaches half Y, straightens to 0° and covers Section 4
              Dark Obsidian (#0D1117) with verified Sprintive reviews
              ========================================================================= */}
          <TiltedSheetSection
            id="testimonials-sheet"
            zIndex={50}
            bg="#0d1117"
            className="text-white py-24 px-6 md:px-14 flex flex-col justify-center"
          >
            <div className="max-w-6xl mx-auto w-full space-y-12">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                  05 — SOCIAL PROOF
                </span>
                <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-none">
                    TRUSTED BY<br />
                    ENGINEERS.
                  </h2>
                </TextBlockAnimation>
                <p className="text-zinc-400 text-xs md:text-sm max-w-xl">
                  See how engineering leaders and agile teams eliminated manual scrum notes and tripled sprint velocity.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-[#161b22] border border-white/10 rounded-none flex flex-col justify-between space-y-6 hover:border-[#EA580C]/40 transition-colors shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-[#EA580C]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="#EA580C" />
                      ))}
                    </div>
                    <p className="text-zinc-300 text-xs md:text-sm leading-relaxed italic">
                      &quot;Sprintive saved our 40-engineer team at least 5 hours per developer every
                      single sprint. The Kanban cards generated from our planning calls are more
                      thorough than what our PMs used to write manually.&quot;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-none bg-[#EA580C]/20 border border-[#EA580C]/40 text-[#EA580C] font-bold flex items-center justify-center text-sm">
                      AC
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">Alex Chen</h5>
                      <p className="text-xs text-zinc-400">VP of Engineering, CloudScale</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-[#161b22] border border-white/10 rounded-none flex flex-col justify-between space-y-6 hover:border-[#EA580C]/40 transition-colors shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-[#EA580C]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="#EA580C" />
                      ))}
                    </div>
                    <p className="text-zinc-300 text-xs md:text-sm leading-relaxed italic">
                      &quot;The 13-agent AI pipeline is astonishing. It doesn&apos;t just capture
                      transcripts—it filters out the banter, isolates architectural decisions, and puts
                      acceptance criteria right into our backlog.&quot;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-none bg-[#EA580C]/20 border border-[#EA580C]/40 text-[#EA580C] font-bold flex items-center justify-center text-sm">
                      ER
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">Elena Rostova</h5>
                      <p className="text-xs text-zinc-400">Head of Product, Synthetix</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-[#161b22] border border-white/10 rounded-none flex flex-col justify-between space-y-6 hover:border-[#EA580C]/40 transition-colors shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-[#EA580C]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="#EA580C" />
                      ))}
                    </div>
                    <p className="text-zinc-300 text-xs md:text-sm leading-relaxed italic">
                      &quot;Meetings used to end with &apos;who&apos;s taking notes?&apos;. Now everyone
                      just leaves the call, and before they open their IDE, all tasks are prioritized
                      and assigned on the board.&quot;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-none bg-[#EA580C]/20 border border-[#EA580C]/40 text-[#EA580C] font-bold flex items-center justify-center text-sm">
                      MV
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">Marcus Vance</h5>
                      <p className="text-xs text-zinc-400">Principal Agile Coach, DevSprint</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TiltedSheetSection>

          {/* =========================================================================
              SECTION 6: FAQS & LAUNCH FOOTER
              Comes from right-bottom at -8° tilt, reaches half Y, straightens to 0° and covers Section 5
              Midnight Black (#08080A) with interactive accordion & final CTA
              ========================================================================= */}
          <TiltedSheetSection
            id="faqs-sheet"
            zIndex={60}
            bg="#08080a"
            className="text-white py-24 px-6 md:px-14 flex flex-col justify-between"
          >
            <div className="max-w-4xl mx-auto w-full space-y-12">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                  06 — COMMON QUESTIONS
                </span>
                <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-none">
                    EVERY QUESTION<br />
                    ANSWERED.
                  </h2>
                </TextBlockAnimation>
              </div>

              {/* Accordion */}
              <div className="space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={index}
                      className="border border-zinc-800/80 rounded-none bg-[#101013] overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full py-4 px-6 flex items-center justify-between text-left gap-4 hover:bg-zinc-800/20 transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-xs sm:text-sm text-zinc-100">{faq.q}</span>
                        <ChevronDown
                          size={18}
                          className={`text-[#EA580C] shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 pt-1 text-xs md:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Final Sprintive CTA Box inside the terminal sheet */}
              <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                    Stop taking notes. <span className="text-[#EA580C]">Start sprinting.</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Experience autonomous meeting transcription, 13-agent AI task synthesis, and automated Kanban workflows.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => navigate("/signup")}
                    className="px-6 py-3 rounded-none bg-[#EA580C] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#c2410c] shadow-[0_4px_24px_rgba(234,88,12,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Create Workspace</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="px-5 py-3 rounded-none border border-zinc-700 text-zinc-200 font-semibold text-xs uppercase tracking-widest hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Bar Footer Info */}
            <div className="max-w-4xl mx-auto w-full pt-8 mt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-none bg-[#EA580C]" />
                <span>sprintive. · Autonomous Agile Platform</span>
              </div>
              <div className="flex items-center gap-6">
                <Link to="/login" className="hover:text-zinc-300 transition-colors">
                  Dashboard
                </Link>
                <Link to="/signup" className="hover:text-zinc-300 transition-colors">
                  Sign Up
                </Link>
                <a
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Back to Top ↑
                </a>
              </div>
            </div>
          </TiltedSheetSection>
        </div>
      ) : (
        <div
          role="status"
          className="min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-white text-gray-500 text-xs font-mono"
        >
          <div className="w-6 h-6 border-2 border-[#EA580C]/30 border-t-[#EA580C] rounded-full animate-spin" />
          <span>Loading perspective…</span>
        </div>
      )}
    </div>
  );
}
