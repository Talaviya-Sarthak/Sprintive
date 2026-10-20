import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Calendar,
  CheckSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Cpu,
  Copy,
  Check,
  Info
} from 'lucide-react';

export default function DownloadPage() {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'started'>('idle');
  const [copiedHash, setCopiedHash] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Verified APK metadata (from twa-manifest.json and signed binary)
  const apkInfo = {
    appName: 'Sprintive',
    tagline: 'Scrum Management, Simplified',
    packageId: 'com.sprintive.app',
    versionName: '1.0',
    versionCode: 1,
    fileSize: '1.45 MB',
    fileType: 'APK (.apk)',
    minAndroid: 'Android 5.0 (Lollipop, API 21) or higher',
    sha256: 'DF52C4F01D4C13358EF7FA178882DEB5BA01E6A9F3D74C3FE59AA71EFDCA2BF6',
  };

  // APK download URL configured via Vite env variable with fallback to statically served public asset
  const apkDownloadUrl = import.meta.env.VITE_ANDROID_APK_URL || '/sprintive-android.apk';

  useEffect(() => {
    // Dynamic page title and SEO meta configuration
    const originalTitle = document.title;
    document.title = 'Download Sprintive for Android — Scrum Management, Simplified';

    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.startsWith('meta[name=')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) element.setAttribute('name', name);
        } else if (selector.startsWith('meta[property=')) {
          const prop = selector.match(/property="([^"]+)"/)?.[1];
          if (prop) element.setAttribute('property', prop);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    updateMetaTag(
      'meta[name="description"]',
      'content',
      'Download Sprintive for Android and simplify Scrum meetings and team task management. Official APK download for Android devices.'
    );
    updateMetaTag('meta[property="og:title"]', 'content', 'Download Sprintive for Android');
    updateMetaTag(
      'meta[property="og:description"]',
      'content',
      'Download Sprintive for Android and simplify Scrum meetings and team task management.'
    );
    updateMetaTag('meta[property="og:url"]', 'content', 'https://sprintiveproduction.vercel.app/download');

    return () => {
      document.title = originalTitle;
    };
  }, []);

  const handleDownload = () => {
    setDownloadState('downloading');

    // Trigger download via anchor
    const link = document.createElement('a');
    link.href = apkDownloadUrl;
    link.download = 'sprintive-android.apk';
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Provide user feedback that download triggered
    setTimeout(() => {
      setDownloadState('started');
    }, 400);
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(apkInfo.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const steps = [
    {
      step: '1',
      title: 'Tap "Download APK"',
      desc: 'Start the download of the signed Sprintive APK directly to your device.',
    },
    {
      step: '2',
      title: 'Wait for download to complete',
      desc: 'Check your notification shade or browser downloads menu until finished.',
    },
    {
      step: '3',
      title: 'Open the downloaded APK',
      desc: 'Tap the completion notification or locate sprintive-android.apk in your Downloads folder.',
    },
    {
      step: '4',
      title: 'Grant installation permission if prompted',
      desc: 'If Android prompts you with "Install unknown apps", tap Settings and toggle allow for your browser or file manager.',
    },
    {
      step: '5',
      title: 'Complete the installation',
      desc: 'Tap "Install" on the Android system installer dialog.',
    },
    {
      step: '6',
      title: 'Open Sprintive and sign in',
      desc: 'Launch Sprintive from your home screen or app drawer and sign in to your team workspace.',
    },
  ];

  const faqs = [
    {
      q: 'Opening this page from WhatsApp, Telegram, or LinkedIn?',
      a: 'If your in-app messenger browser prevents downloads, tap the three vertical dots (⋮) in the top-right corner and select "Open in Chrome" or "Open in default browser" to complete the download easily.',
    },
    {
      q: 'Why does Android show a "File might be harmful" warning?',
      a: 'This is a standard Android system notice shown for any APK downloaded outside the Google Play Store. Sprintive\'s APK is cryptographically signed and verified safe.',
    },
    {
      q: 'What Android versions are supported?',
      a: 'Sprintive requires Android 5.0 (API level 21) or higher, making it compatible with virtually all modern and legacy Android smartphones and tablets.',
    },
    {
      q: 'Will my team data and Kanban board stay in sync?',
      a: 'Yes. The Android application connects to the exact same cloud workspace, meetings, and Kanban boards as the web app at sprintiveproduction.vercel.app.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-zinc-900 flex flex-col font-sans selection:bg-[#F97316] selection:text-white">
      {/* SECTION A: HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Application Name */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center shadow-sm transition-transform duration-150 group-hover:scale-105">
              <span className="font-mono font-black text-white text-sm">S</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-zinc-950">
                Sprin<span className="text-[#F97316]">tive</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              to="/"
              className="text-xs sm:text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-zinc-100"
            >
              <ArrowLeft size={14} />
              <span>Back to Sprintive</span>
            </Link>

            <a
              href="https://sprintiveproduction.vercel.app/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950 transition-colors shadow-xs"
            >
              <span>Web App</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* SECTION B: HERO SECTION */}
        <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-zinc-200 bg-white overflow-hidden">
          {/* Subtle background grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.35]"
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Heading, Description, CTA */}
              <div className="lg:col-span-7 space-y-6 text-left">
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/70 text-[#EA580C] text-xs font-semibold">
                  <Smartphone size={14} className="text-[#F97316]" />
                  <span>Official Android Release</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span className="text-[11px] font-mono text-zinc-500">v{apkInfo.versionName}</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight text-zinc-950 leading-[1.1]">
                    Sprintive — Scrum Management, Simplified
                  </h1>
                  <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl font-normal">
                    Manage your Scrum meetings, collaborate with your team, and organize your work with Sprintive.
                  </p>
                  <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
                    Access your sprints, join meetings, and manage Kanban tickets on the go with Sprintive on Android.
                  </p>
                </div>

                {/* Hero CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm tracking-wide transition-all duration-150 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
                    id="hero-download-btn"
                  >
                    <Download size={18} strokeWidth={2.4} />
                    <span>Download for Android</span>
                  </button>

                  <a
                    href="https://sprintiveproduction.vercel.app/"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-zinc-950 font-semibold text-sm transition-colors shadow-xs"
                  >
                    <span>Open Sprintive Web App</span>
                    <ExternalLink size={15} />
                  </a>
                </div>

                {/* Quick Trust Badges */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-3 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#10B981]" />
                    <span>Direct Signed APK</span>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileCheck size={14} className="text-zinc-500" />
                    <span>{apkInfo.fileSize}</span>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span>{apkInfo.minAndroid}</span>
                </div>
              </div>

              {/* Right Column: Interactive App Preview Card */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200/90 shadow-lg p-6 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F97316] flex items-center justify-center shadow-sm">
                        <span className="font-mono font-black text-white text-xl">S</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-zinc-950">Sprintive for Android</h3>
                        <p className="text-xs text-zinc-500 font-mono">com.sprintive.app</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-[#10B981] border border-emerald-200/70 text-[11px] font-bold">
                      Ready
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-500">Package ID</span>
                      <span className="font-mono font-semibold text-zinc-800">{apkInfo.packageId}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-500">Version</span>
                      <span className="font-mono font-semibold text-zinc-800">{apkInfo.versionName} (Build {apkInfo.versionCode})</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-500">Download Size</span>
                      <span className="font-mono font-semibold text-zinc-800">{apkInfo.fileSize}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-500">Requirements</span>
                      <span className="font-medium text-zinc-800 text-right">Android 5.0+</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download APK ({apkInfo.fileSize})</span>
                  </button>

                  {downloadState === 'started' && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fadeIn">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Download initiated!</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Check your notification shade or browser downloads folder.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION C: FEATURES SECTION */}
        <section className="py-16 sm:py-20 border-b border-zinc-200 bg-[#F8FAFC]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                Designed For Modern Teams
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                Features You Love, Anywhere You Go
              </h2>
              <p className="text-sm text-zinc-600">
                Core capabilities built directly into Sprintive to keep your agile engineering team aligned.
              </p>
            </div>

            {/* Exactly 3 Cards as specified in Step 2C */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Scrum Meetings */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#F97316]">
                    <Calendar size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-950 mb-1.5">Scrum Meetings</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      Join and manage Scrum meetings with your team.
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <CheckCircle2 size={13} className="text-[#10B981]" />
                  <span>Real-time voice &amp; agenda tracking</span>
                </div>
              </div>

              {/* Feature 2: Task Management */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                    <CheckSquare size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-950 mb-1.5">Task Management</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      Organize tasks and tickets to keep your team aligned.
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <CheckCircle2 size={13} className="text-[#10B981]" />
                  <span>Interactive Kanban board &amp; priorities</span>
                </div>
              </div>

              {/* Feature 3: Mobile Access */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                    <Smartphone size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-950 mb-1.5">Mobile Access</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      Access Sprintive on your Android phone.
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <CheckCircle2 size={13} className="text-[#10B981]" />
                  <span>Fast, standalone APK performance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION D: DOWNLOAD SECTION */}
        <section id="download-section" className="py-16 sm:py-20 border-b border-zinc-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6 sm:p-10 shadow-sm space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">
                  Get Sprintive for Android
                </h2>
                <p className="text-sm sm:text-base text-zinc-600 max-w-lg mx-auto">
                  Download the Android application and install it on your device.
                </p>
              </div>

              {/* Download Action Box */}
              <div className="flex flex-col items-center justify-center gap-4">
                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto min-w-[280px] px-8 py-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-black text-base tracking-wide flex items-center justify-center gap-3 transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
                  id="primary-download-btn"
                >
                  <Download size={20} strokeWidth={2.5} />
                  <span>Download APK</span>
                </button>

                {/* Direct link fallback */}
                <p className="text-xs text-zinc-500">
                  Direct link: <a href={apkDownloadUrl} download="sprintive-android.apk" className="text-[#F97316] font-semibold hover:underline">sprintive-android.apk</a> ({apkInfo.fileSize})
                </p>

                {downloadState === 'started' && (
                  <div className="w-full max-w-md p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Download started!</p>
                      <p className="text-emerald-700 text-xs mt-1">
                        If your download did not begin automatically, please check your browser permission popups or tap the direct link above.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Technical Metadata Table */}
              <div className="pt-6 border-t border-zinc-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 text-center sm:text-left">
                  Verified Application Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Application</span>
                    <span className="font-bold text-zinc-900 text-sm mt-0.5 block">{apkInfo.appName}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Platform</span>
                    <span className="font-bold text-zinc-900 text-sm mt-0.5 block">Android</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Package ID</span>
                    <span className="font-mono font-bold text-zinc-900 text-[11px] sm:text-xs mt-0.5 block truncate" title={apkInfo.packageId}>
                      {apkInfo.packageId}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">File Type</span>
                    <span className="font-bold text-zinc-900 text-sm mt-0.5 block">{apkInfo.fileType}</span>
                  </div>
                </div>

                {/* Additional Verified Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mt-3">
                  <div className="p-3 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">File Size</span>
                    <span className="font-mono font-bold text-zinc-900 text-sm mt-0.5 block">{apkInfo.fileSize}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Release Version</span>
                    <span className="font-mono font-bold text-zinc-900 text-sm mt-0.5 block">v{apkInfo.versionName}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-zinc-200 col-span-2 sm:col-span-1">
                    <span className="text-zinc-500 block text-[11px]">Supported OS</span>
                    <span className="font-medium text-zinc-900 text-xs mt-0.5 block">Android 5.0+</span>
                  </div>
                </div>

                {/* SHA-256 Checksum Verification */}
                <div className="mt-4 p-3 bg-white rounded-lg border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="overflow-hidden w-full">
                    <span className="text-zinc-500 text-[11px] block">Cryptographic Checksum (SHA-256)</span>
                    <span className="font-mono text-[11px] text-zinc-700 truncate block mt-0.5">
                      {apkInfo.sha256}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyHash}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold shrink-0 cursor-pointer transition-colors"
                  >
                    {copiedHash ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION E: INSTALLATION INSTRUCTIONS */}
        <section className="py-16 sm:py-20 border-b border-zinc-200 bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                Step-by-Step Guide
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">
                How to Install Sprintive on Android
              </h2>
              <p className="text-sm text-zinc-600">
                Follow these six straightforward steps to install and start using Sprintive.
              </p>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] font-black text-sm flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-zinc-950">{item.title}</h4>
                    <p className="text-xs text-zinc-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Note Alert (as required by prompt) */}
            <div className="p-4 sm:p-5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3">
              <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="font-bold">Security Notice:</p>
                <p className="text-amber-900 leading-relaxed">
                  Install APK files only when you trust the source. Android may ask you to authorize installation from your browser or file manager.
                </p>
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <div className="space-y-3 pt-6">
              <h3 className="text-lg font-bold text-zinc-950 text-center sm:text-left">
                Installation Troubleshooting &amp; FAQs
              </h3>
              <div className="space-y-2">
                {faqs.map((faq, idx) => (
                  <div
                    key={faq.q}
                    className="bg-white rounded-xl border border-zinc-200 overflow-hidden transition-all duration-150"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-zinc-900 hover:text-zinc-950 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {expandedFaq === idx ? (
                        <ChevronUp size={16} className="text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-zinc-500 shrink-0" />
                      )}
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-5 pb-4 pt-1 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION F: FOOTER */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-zinc-100">
            {/* Branding */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F97316] flex items-center justify-center shadow-xs">
                <span className="font-mono font-black text-white text-xs">S</span>
              </div>
              <span className="font-extrabold text-base tracking-tight text-zinc-950">
                Sprin<span className="text-[#F97316]">tive</span>
              </span>
            </div>

            {/* Footer Navigation */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-zinc-600">
              <Link to="/" className="hover:text-zinc-950 transition-colors">
                Home
              </Link>
              <Link to="/contact" className="hover:text-zinc-950 transition-colors">
                Contact
              </Link>
              <Link to="/about" className="hover:text-zinc-950 transition-colors">
                About
              </Link>
              <a
                href="https://sprintiveproduction.vercel.app/"
                className="hover:text-zinc-950 transition-colors inline-flex items-center gap-1"
              >
                <span>Web App</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <span>© 2026 Sprintive. All rights reserved.</span>
            <span>Scrum Management, Simplified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
