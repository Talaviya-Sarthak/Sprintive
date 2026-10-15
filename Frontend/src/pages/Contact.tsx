import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    }, 600);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-white text-black flex flex-col justify-between selection:bg-[#EA580C] selection:text-white">
      {/* Streamlined Header: Logo on left, Back to Home & Get Started on right */}
      <header className="w-full border-b border-zinc-100 bg-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-[#EA580C] flex items-center justify-center shadow-sm">
              <span className="font-mono font-black text-white text-xs">S</span>
            </div>
            <span className="font-mono font-black text-xl tracking-tight text-black">
              sprintive<span className="text-[#EA580C]">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/"
              className="text-xs font-semibold text-zinc-600 hover:text-black transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content: Scaled to fit comfortably on 100vh without vertical scroll */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-4 md:py-8 w-full flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          {/* Left Column (Heading, Description & 2 Info Cards) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tight text-black uppercase leading-[0.92] select-none font-sans">
                CONNECT<br />
                WITH<br />
                SPRINTIVE.
              </h1>
              <p className="text-zinc-600 text-xs sm:text-sm md:text-base leading-relaxed max-w-lg font-normal pt-1">
                Have questions about real-time voice conference, multi-agent AI task synthesis, or bespoke Jira &amp; Linear integrations? Our product engineering team is available 24/7.
              </p>
            </div>

            {/* 2 Bottom Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 sm:p-5 border border-zinc-200 bg-white shadow-sm flex flex-col justify-between space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black">
                  SUPPORT &amp; PRODUCT
                </span>
                <a
                  href="mailto:support@sprintive.ai"
                  className="text-xs font-bold text-black hover:text-[#EA580C] transition-colors"
                >
                  support@sprintive.ai
                </a>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  For workspace support, bug reports, and feedback.
                </p>
              </div>

              <div className="p-4 sm:p-5 border border-zinc-200 bg-white shadow-sm flex flex-col justify-between space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black">
                  ENTERPRISE &amp; PRESS
                </span>
                <a
                  href="mailto:founders@sprintive.ai"
                  className="text-xs font-bold text-black hover:text-[#EA580C] transition-colors"
                >
                  founders@sprintive.ai
                </a>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Direct founder access for enterprise inquiries and custom SLA.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Floating Card from screenshot) */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="bg-white border border-zinc-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-6 sm:p-8 w-full max-w-md">
              {isSubmitted ? (
                <div className="py-8 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="text-base font-bold text-black uppercase tracking-tight">
                    Message Sent
                  </h3>
                  <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
                    Thank you for reaching out. A Sprintive product engineer will reply to your email within 2 hours.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-black underline cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-800 mb-1">
                      YOUR NAME
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full bg-black text-white px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#EA580C] placeholder-zinc-500 rounded-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-800 mb-1">
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full bg-black text-white px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#EA580C] placeholder-zinc-500 rounded-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-800 mb-1">
                      MESSAGE
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help?"
                      className="w-full bg-white text-black border border-zinc-200 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black placeholder-zinc-400 resize-none min-h-[90px] rounded-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-zinc-100 hover:bg-black hover:text-white text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border border-zinc-200 shadow-sm rounded-none"
                  >
                    {isSubmitting ? (
                      <span>SENDING...</span>
                    ) : (
                      <>
                        <span>SEND MESSAGE</span>
                        <Send size={12} className="shrink-0" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Sub-bar */}
      <footer className="w-full border-t border-zinc-100 py-3.5 bg-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            <span>&copy; {new Date().getFullYear()} Sprintive Inc.</span>
          </div>
          <span>Autonomous Agile Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
