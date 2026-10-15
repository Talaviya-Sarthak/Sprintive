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
  ChevronLeft,
  Check,
  ArrowUp,
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

const testimonials = [
  {
    quote: "Sprintive's customer support is unparalleled. They're always there when we need them.",
    author: "Olivia",
    role: "Customer Success Manager at ClientCare",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&h=180&q=80",
  },
  {
    quote: "The efficiency gains we've seen since implementing Sprintive are off the charts!",
    author: "Raj",
    role: "Operations Manager at StreamlineSolutions",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&h=180&q=80",
  },
  {
    quote: "Sprintive has revolutionized how we handle our workflows. It's a game-changer!",
    author: "Lila",
    role: "Workflow Specialist at ProcessHub",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=180&h=180&q=80",
  },
  {
    quote: "The scalability of Sprintive's AI solution is impressive. It integrates with our business seamlessly.",
    author: "Trevor",
    role: "Scaling Officer at GrowthLab",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&h=180&q=80",
  },
  {
    quote: "It's so simple and intuitive. It got the team up to speed in minutes.",
    author: "Marina",
    role: "HR & Agile Manager at TalentForge",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&h=180&q=80",
  },
  {
    quote: "I've been searching for a solution like Sprintive for years. So glad I finally found it!",
    author: "Elena",
    role: "VP of Engineering at Synthetix",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=180&h=180&q=80",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [face, setFace] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingAnnual, setBillingAnnual] = useState<boolean>(true);
  const [activeTestimonial, setActiveTestimonial] = useState<number>(1);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePipelineStep((prev) => (prev + 1) % 7);
    }, 1600);
    return () => clearInterval(timer);
  }, []);
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
      title: "Meeting Created",
      desc: "Launch standups, planning, or retros in 1-click.",
      icon: Calendar,
    },
    {
      num: "02",
      title: "AI Listens",
      desc: "Real-time voice processing & noise-isolated audio stream.",
      icon: Mic,
    },
    {
      num: "03",
      title: "Live Transcript",
      desc: "Instant speaker-diarized text generated live.",
      icon: FileText,
    },
    {
      num: "04",
      title: "AI Analysis",
      desc: "Context-aware extraction of decisions & blockers.",
      icon: Bot,
    },
    {
      num: "05",
      title: "Task Extraction",
      desc: "Automatically assigned tickets with priority tags.",
      icon: CheckSquare,
    },
    {
      num: "06",
      title: "Kanban Updated",
      desc: "Sprint board syncs instantly without manual entry.",
      icon: Kanban,
    },
    {
      num: "07",
      title: "Sprint Ready",
      desc: "Clear goals, automated insights, and team alignment.",
      icon: Rocket,
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

              {/* Stepper Pipeline: Clean, Minimal, Premium Stepper with Smooth Transition */}
              <div className="w-full overflow-x-auto pb-4 pt-4 scrollbar-none">
                <div className="min-w-[960px] max-w-[1240px] mx-auto px-4">
                  <div className="relative">
                    {/* Connecting Rail Line */}
                    <div className="absolute top-[26px] left-[7%] right-[7%] h-[2px] bg-zinc-200/90 z-0 overflow-visible">
                      {/* Active animated progress line smoothly expanding from step 1 to 7 */}
                      <div
                        className="h-full bg-gradient-to-r from-[#EA580C] via-[#f97316] to-[#EA580C] transition-all duration-700 ease-in-out relative"
                        style={{
                          width: `${(activePipelineStep / (pipelineSteps.length - 1)) * 100}%`,
                        }}
                      >
                        {/* Glowing runner packet at the advancing tip */}
                        <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#EA580C] shadow-[0_0_12px_#ea580c,0_0_24px_#f97316] animate-pulse" />
                      </div>
                    </div>

                    {/* 7 Pipeline Stepper Nodes */}
                    <div className="grid grid-cols-7 gap-2 relative z-10">
                      {pipelineSteps.map((step, index) => {
                        const Icon = step.icon;
                        const isCurrent = index === activePipelineStep;
                        const isCompleted = index < activePipelineStep;
                        const isLast = index === pipelineSteps.length - 1;

                        return (
                          <div
                            key={step.num}
                            onClick={() => setActivePipelineStep(index)}
                            className="flex flex-col items-center text-center group cursor-pointer transition-all duration-300"
                          >
                            {/* Circular Stepper Node */}
                            <div className="relative mb-4">
                              <div
                                className={cn(
                                  "w-[52px] h-[52px] rounded-full bg-white border-2 flex items-center justify-center transition-all duration-500 shadow-xs",
                                  isCurrent
                                    ? isLast
                                      ? "border-emerald-500 text-emerald-600 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20"
                                      : "border-[#EA580C] text-[#EA580C] scale-110 shadow-[0_0_20px_rgba(234,88,12,0.35)] ring-4 ring-[#EA580C]/20"
                                    : isCompleted
                                    ? isLast
                                      ? "border-emerald-500 text-emerald-600 shadow-sm"
                                      : "border-[#EA580C] text-[#EA580C] shadow-sm"
                                    : "border-zinc-200 text-zinc-400 group-hover:border-zinc-400 group-hover:text-zinc-600"
                                )}
                              >
                                <Icon
                                  size={20}
                                  className={cn(
                                    "transition-transform duration-300",
                                    isCurrent ? "scale-110 stroke-[2.2]" : "stroke-[1.8]"
                                  )}
                                />
                              </div>

                              {/* Stage Number Floating Pill */}
                              <span
                                className={cn(
                                  "absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider transition-all duration-300 border",
                                  isCurrent
                                    ? isLast
                                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm scale-105"
                                      : "bg-[#EA580C] text-white border-[#EA580C] shadow-sm scale-105"
                                    : isCompleted
                                    ? "bg-white text-[#EA580C] border-[#EA580C]"
                                    : "bg-white text-zinc-400 border-zinc-200 group-hover:border-zinc-300"
                                )}
                              >
                                {step.num}
                              </span>
                            </div>

                            {/* Step Title */}
                            <h4
                              className={cn(
                                "text-xs font-bold tracking-tight uppercase mb-1.5 transition-colors duration-300",
                                isCurrent
                                  ? isLast
                                    ? "text-emerald-700 font-extrabold"
                                    : "text-[#EA580C] font-extrabold"
                                  : isCompleted
                                  ? "text-zinc-900"
                                  : "text-zinc-500"
                              )}
                            >
                              {step.title}
                            </h4>

                            {/* Step Description */}
                            <p
                              className={cn(
                                "text-[11px] leading-relaxed max-w-[130px] transition-colors duration-300",
                                isCurrent ? "text-zinc-700 font-medium" : "text-zinc-500 font-normal"
                              )}
                            >
                              {step.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TiltedSheetSection>

          {/* =========================================================================
              SECTION 4: TRANSPARENT PRICING
              Comes from right-bottom at -8° tilt, reaches half Y, straightens to 0° and covers Section 3
              Deep Midnight Obsidian (#0B1120) with clean minimal premium pricing cards
              ========================================================================= */}
          <TiltedSheetSection
            id="pricing-sheet"
            zIndex={40}
            bg="#1D4ED8"
            className="text-white py-24 px-6 md:px-14 flex flex-col justify-center relative overflow-hidden"
          >
            {/* Ambient Top Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.15),transparent_70%)] pointer-events-none" />

            <div className="max-w-6xl mx-auto w-full space-y-12 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                    <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#FED7AA] uppercase">
                      04 — TRANSPARENT PRICING
                    </span>
                  </div>
                  <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                    <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-none">
                      INVEST IN<br />
                      VELOCITY.
                    </h2>
                  </TextBlockAnimation>
                  <p className="text-zinc-400 text-xs md:text-sm max-w-lg leading-relaxed">
                    Simple, transparent plans designed for fast-growing engineering teams. Unlimited scale, zero per-token surprises.
                  </p>
                </div>

                {/* Floating Modern Pill Toggle */}
                <div className="inline-flex items-center p-1 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl shadow-lg self-start md:self-auto">
                  <button
                    onClick={() => setBillingAnnual(false)}
                    className={cn(
                      "text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer",
                      !billingAnnual
                        ? "bg-white text-zinc-900 shadow-md font-bold"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingAnnual(true)}
                    className={cn(
                      "text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                      billingAnnual
                        ? "bg-[#EA580C] text-white shadow-md shadow-[#EA580C]/30 font-bold"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <span>Annual</span>
                    <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Clean Minimal Premium Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Starter Tier */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white text-zinc-900 shadow-xl border border-white/60 flex flex-col justify-between space-y-6 hover:translate-y-[-2px] transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        STARTER
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-mono font-bold text-zinc-600 uppercase">
                        Free
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Indie Squad</h3>
                      <div className="flex items-baseline gap-1 pt-1.5">
                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-zinc-900">$0</span>
                        <span className="text-xs text-zinc-500 font-medium">/ month</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Up to 5 AI meetings / mo</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Live speech transcription</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Interactive Kanban board</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 text-zinc-900 hover:bg-zinc-900 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    Start Free
                  </button>
                </div>

                {/* Pro Tier (Featured Centerpiece) */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white text-zinc-900 shadow-2xl border-2 border-[#EA580C] flex flex-col justify-between space-y-6 relative md:-translate-y-2 hover:translate-y-[-4px] transition-all duration-300 ring-4 ring-black/5">
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-[#EA580C] text-white font-mono text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1">
                    <Sparkles size={11} className="text-white" />
                    <span>Most Popular</span>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#EA580C]">
                        PRO TEAM
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EA580C]/10 text-[10px] font-mono font-bold text-[#EA580C] uppercase">
                        14-Day Trial
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Autonomous Sprint</h3>
                      <div className="flex items-baseline gap-1 pt-1.5">
                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-zinc-900">
                          {billingAnnual ? "$24" : "$29"}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">/ seat / mo</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-zinc-100 text-xs text-zinc-700">
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#EA580C]/15 text-[#EA580C] flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-zinc-900">Unlimited meetings & transcripts</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#EA580C]/15 text-[#EA580C] flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-zinc-900">13-agent AI task synthesis</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#EA580C]/15 text-[#EA580C] flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Instant Jira & Linear sync</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full py-3 rounded-xl bg-[#EA580C] hover:bg-[#ff6d1f] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#EA580C]/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Enterprise Tier */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white text-zinc-900 shadow-xl border border-white/60 flex flex-col justify-between space-y-6 hover:translate-y-[-2px] transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        ENTERPRISE
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-mono font-bold text-zinc-600 uppercase">
                        Dedicated
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Custom Scale</h3>
                      <div className="flex items-baseline gap-1 pt-1.5">
                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-zinc-900">Custom</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Dedicated multi-agent compute</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>SAML 2.0 SSO & directory sync</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Zero-data-retention VPC deployment</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full py-2.5 rounded-xl border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    Contact Sales
                  </button>
                </div>
              </div>

              {/* Bottom Trust Ribbon */}
              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 md:gap-12 text-xs font-medium text-zinc-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#EA580C]" />
                  <span>Enterprise-Grade 256-bit AES Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-[#EA580C]" />
                  <span>Instant Setup • Cancel Anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-[#EA580C]" />
                  <span>14-Day Full Access Trial</span>
                </div>
              </div>
            </div>
          </TiltedSheetSection>

          {/* =========================================================================
              SECTION 5: SOCIAL PROOF / TESTIMONIALS
              Comes from right-bottom at -8? tilt, reaches half Y, straightens to 0? and covers Section 4
              Dark Obsidian (#0D1117) with horizontal 3D perspective testimonials cards
              ========================================================================= */}
          <TiltedSheetSection
            id="testimonials-sheet"
            zIndex={50}
            bg="#0d1117"
            className="text-white py-24 px-6 md:px-14 flex flex-col justify-center overflow-hidden"
          >
            <div className="max-w-6xl mx-auto w-full space-y-10">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                  05 ? SOCIAL PROOF
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

              {/* Horizontal 3D Perspective Testimonials Cards */}
              <div className="relative w-full h-[430px] flex items-center justify-center overflow-hidden select-none">
                {testimonials.map((item, index) => {
                  const total = testimonials.length;
                  let diff = index - activeTestimonial;
                  if (diff > total / 2) diff -= total;
                  if (diff < -total / 2) diff += total;

                  let xOffset = 0;
                  let scale = 1;
                  let rotation = 0;
                  let zIndex = 10;
                  let opacity = 1;

                  if (diff === 0) {
                    xOffset = 0;
                    scale = 1.05;
                    rotation = 0;
                    zIndex = 30;
                    opacity = 1;
                  } else if (diff === -1) {
                    xOffset = -280;
                    scale = 0.92;
                    rotation = -3.5;
                    zIndex = 20;
                    opacity = 0.85;
                  } else if (diff === 1) {
                    xOffset = 280;
                    scale = 0.92;
                    rotation = 3;
                    zIndex = 20;
                    opacity = 0.85;
                  } else if (diff === -2) {
                    xOffset = -530;
                    scale = 0.82;
                    rotation = -6;
                    zIndex = 10;
                    opacity = 0.45;
                  } else if (diff === 2) {
                    xOffset = 530;
                    scale = 0.82;
                    rotation = 6;
                    zIndex = 10;
                    opacity = 0.45;
                  } else {
                    const sign = diff < 0 ? -1 : 1;
                    xOffset = sign * 750;
                    scale = 0.7;
                    rotation = sign * 8;
                    zIndex = 5;
                    opacity = 0;
                  }

                  const isCenter = diff === 0;

                  return (
                    <div
                      key={index}
                      onClick={() => setActiveTestimonial(index)}
                      className={cn(
                        "absolute w-[290px] sm:w-[350px] h-[330px] sm:h-[360px] p-7 sm:p-8 flex flex-col justify-between cursor-pointer",
                        "transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
                        isCenter
                          ? "bg-[#EAEAEA] text-black shadow-2xl"
                          : "bg-[#12151D] text-white border border-white/10 shadow-xl hover:border-white/25"
                      )}
                      style={{
                        left: "50%",
                        top: "50%",
                        transform: `translate(calc(-50% + ${xOffset}px), -50%) scale(${scale}) rotate(${rotation}deg)`,
                        zIndex,
                        opacity,
                        clipPath: "polygon(0 0, calc(100% - 36px) 0, 100% 36px, 100% 100%, 0 100%)",
                        pointerEvents: opacity === 0 ? "none" : "auto",
                      }}
                    >
                      <div className="space-y-4">
                        <img
                          src={item.avatar}
                          alt={item.author}
                          className={cn(
                            "w-12 h-12 object-cover rounded-sm",
                            isCenter ? "border border-black/15 shadow-sm" : "border border-white/10"
                          )}
                        />
                        <p
                          className={cn(
                            "text-sm sm:text-base font-bold leading-snug tracking-tight pt-1",
                            isCenter ? "text-black" : "text-white"
                          )}
                        >
                          &ldquo;{item.quote}&rdquo;
                        </p>
                      </div>

                      <div className="pt-4">
                        <p
                          className={cn(
                            "text-xs italic leading-tight",
                            isCenter ? "text-zinc-600" : "text-zinc-400"
                          )}
                        >
                          - {item.author}, {item.role}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Centered Controls (< and >) matching the screenshot */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <button
                  onClick={() =>
                    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
                  }
                  className="w-10 h-10 bg-black border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() =>
                    setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
                  }
                  className="w-10 h-10 bg-black border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                  aria-label="Next testimonial"
                >
                  <ChevronRight size={16} />
                </button>
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
            className="text-white pt-24 pb-0 px-0 flex flex-col justify-between"
          >
            <div className="max-w-4xl mx-auto w-full px-6 md:px-14 space-y-12">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                    06 — COMMON QUESTIONS
                  </span>
                </div>
                <TextBlockAnimation blockColor="#EA580C" duration={0.8}>
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-none">
                    EVERY QUESTION<br />
                    ANSWERED.
                  </h2>
                </TextBlockAnimation>
                <p className="text-zinc-400 text-xs md:text-sm max-w-lg leading-relaxed">
                  Everything you need to know about autonomous meeting audio ingestion, multi-agent LLM task synthesis, and Kanban sync.
                </p>
              </div>

              {/* Accordion with clean minimal rounded corners */}
              <div className="space-y-3.5">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={index}
                      className="border border-white/10 rounded-2xl bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all duration-200 hover:border-white/20"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full py-4 px-6 flex items-center justify-between text-left gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
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
                        <div className="px-6 pb-5 pt-1 text-xs md:text-sm text-zinc-400 leading-relaxed border-t border-white/10">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =========================================================================
                CLEAN MINIMAL PREMIUM FOOTER
                ========================================================================= */}
            <footer className="w-full mt-20 pt-10 pb-12 border-t border-white/[0.08] bg-[#050507]">
              <div className="max-w-6xl mx-auto px-6 md:px-10">
                {/* Main Row: Brand & Minimal Navigation */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-white/[0.06]">
                  {/* Brand & Mission Tagline */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-[#EA580C] flex items-center justify-center shadow-sm">
                        <span className="font-mono font-black text-white text-xs">S</span>
                      </div>
                      <span className="font-mono font-black text-lg tracking-tight text-white">
                        sprintive<span className="text-[#EA580C]">.</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                      Autonomous meeting intelligence and AI task synthesis for modern engineering teams.
                    </p>
                  </div>

                  {/* Clean Curated Navigation */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-zinc-400">
                    <a href="#how-it-works-sheet" className="hover:text-white transition-colors">
                      Pipeline
                    </a>
                    <a href="#pricing-sheet" className="hover:text-white transition-colors">
                      Pricing
                    </a>
                    <a href="#testimonials-sheet" className="hover:text-white transition-colors">
                      Reviews
                    </a>
                    <a href="#faqs-sheet" className="hover:text-white transition-colors">
                      FAQ
                    </a>
                    <Link to="/contact" className="hover:text-white transition-colors">
                      Contact
                    </Link>
                    <Link to="/login" className="hover:text-white transition-colors">
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="text-white hover:text-[#EA580C] font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>Get Started</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Sub-bar: Copyright, Socials & Back to Top */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span>&copy; {new Date().getFullYear()} Sprintive Inc.</span>
                    <span className="text-zinc-700">&bull;</span>
                    <span className="text-zinc-500">Engineered for velocity.</span>
                  </div>

                  <div className="flex items-center gap-5">
                    {/* Minimal Social Icons */}
                    <div className="flex items-center gap-3.5 text-zinc-400">
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                        aria-label="GitHub"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      </a>
                      <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                        aria-label="X"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                      <a
                        href="https://discord.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                        aria-label="Discord"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      </a>
                    </div>

                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-zinc-400 group"
                    >
                      <span>Back to Top</span>
                      <ArrowUp size={12} className="text-[#EA580C] group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </footer>
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
