'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SociLinkLogo } from '../ui/SociLinkLogo';
import {
  Shield,
  FileText,
  Users,
  ArrowLeft,
  Lock,
  CheckCircle,
  ExternalLink,
  Mail,
  Scale,
} from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  badge: string;
  children: React.ReactNode;
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  badge,
  children,
}: LegalLayoutProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/privacy', label: 'Privacy Policy', icon: Shield },
    { href: '/terms', label: 'Terms of Service', icon: FileText },
    { href: '/guidelines', label: 'Community Guidelines', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col selection:bg-rose-500/30 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#07090E]/85 border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition cursor-pointer">
            <SociLinkLogo size="sm" showText={true} />
            <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
              LEGAL & TRUST
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="py-1.5 px-3.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition flex items-center gap-1.5 border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>
          </div>
        </div>

        {/* Legal Navigation Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 overflow-x-auto no-scrollbar flex items-center gap-2 border-t border-white/[0.04]">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                    : 'text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Document Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-3">
            <span className="py-1 px-3 rounded-full text-[10px] font-mono tracking-wider uppercase font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <Shield className="w-3 h-3 text-rose-400" />
              <span>{badge}</span>
            </span>
            <span className="text-xs text-slate-400">
              Last updated: <strong className="text-slate-200">{lastUpdated}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-white/[0.08] text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Kenya Data Protection Act 2019 Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Lock className="w-4 h-4" />
              <span>Strict 18+ Age Gated</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <Scale className="w-4 h-4" />
              <span>M-PESA Escrow Protocol</span>
            </div>
          </div>
        </div>

        {/* Document Body */}
        <div className="space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed">
          {children}
        </div>

        {/* Contact & Support Section */}
        <div className="mt-12 p-6 rounded-3xl glass-panel border border-white/10 text-center space-y-3">
          <h3 className="text-base font-bold text-white">Have questions regarding our legal terms or privacy?</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Our Data Protection Officer and Legal Compliance Team are available to assist with data inquiries, rights requests, or dispute resolutions.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="mailto:legal@socilalink.me.ke"
              className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 transition flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-rose-400" />
              <span>legal@socilalink.me.ke</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0A0D17]/90 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <SociLinkLogo size="sm" showText={true} />
            <span className="text-slate-500">© 2026 SociLaLink Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link href="/guidelines" className="hover:text-white transition">Community Guidelines</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
