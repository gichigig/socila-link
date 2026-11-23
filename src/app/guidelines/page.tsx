import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  Heart,
  ShieldAlert,
  MapPin,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Smile,
  PhoneCall,
  DollarSign,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community Guidelines & Safety Standards — SociLaLink',
  description: 'SociLaLink rules of conduct, in-person date safety guidelines, content standards, and anti-harassment policies.',
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalLayout
      title="Community Guidelines"
      subtitle="SociLaLink is built on mutual respect, creator empowerment, and adult safety. These guidelines outline expected behavior and our zero-tolerance safety policies."
      lastUpdated="November 23, 2026"
      badge="Safety & Trust"
    >
      {/* 1. Core Principles */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
          <span>Our Core Values: Respect, Consent & Transparency</span>
        </h2>
        <p>
          Every connection on SociLaLink begins with clear, enthusiastic mutual consent. Whether browsing singles, chatting in private conversations, scheduling companion meetings, or unlocking creator moments, every member is expected to treat others with dignity and respect.
        </p>
      </section>

      {/* 2. Zero-Tolerance Violations */}
      <section className="p-6 rounded-2xl glass-card border border-rose-500/30 bg-rose-500/[0.03] space-y-3">
        <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <span>Zero-Tolerance Offenses (Immediate Permanent Ban)</span>
        </h2>
        <p className="text-xs text-slate-300">
          The following activities will result in immediate account termination, forfeiture of wallet balances, and reporting to law enforcement authorities:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <strong className="text-rose-300 block mb-1">Underage Engagement</strong>
            Zero tolerance for minors. Any attempt by an adult to engage with a minor or falsely register will be reported to Kenyan authorities.
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <strong className="text-rose-300 block mb-1">Non-Consensual Imagery (NCII)</strong>
            Revenge porn, sharing leaked private photos, or non-consensual recordings will result in immediate bans and legal referral.
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <strong className="text-rose-300 block mb-1">Blackmail & Extortion</strong>
            Threatening to release private chats, photos, or location history in exchange for money or sexual favors is strictly prosecuted.
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <strong className="text-rose-300 block mb-1">Prostitution & Trafficking</strong>
            SociLaLink is a social lifestyle and companion platform, not a brothel or solicitation network. Commercial sex work is prohibited.
          </div>
        </div>
      </section>

      {/* 3. Golden Rules for In-Person Meeting Safety */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
          <span>In-Person Date Safety: The Golden Rules</span>
        </h2>
        <p className="text-xs text-slate-300">
          When meeting someone from SociLaLink for a companion date or casual meetup, prioritize your personal safety above all else:
        </p>

        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">Always Meet in Public Venues</strong>
              Choose populated public venues for your initial meetings: well-reviewed restaurants, cafes, lounges, or hotel dining spaces. Never agree to meet in isolated private residences or deserted spots.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">Share Live Location with a Trusted Friend</strong>
              Use SociLaLink&rsquo;s built-in <em>Live Location Sharing</em> or your phone&rsquo;s native sharing to let a trusted friend or family member know where you are and whom you are meeting.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">Protect Your 6-Digit Escrow Code</strong>
              Do not reveal the 6-digit escrow verification code over text or phone before meeting. Only share it verbally once you have physically sat down with your date at the agreed venue.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">Control Your Own Transportation</strong>
              Have your own reliable way to and from the date. Never depend on a stranger for rides during your first meeting.
            </div>
          </div>
        </div>
      </section>

      {/* 4. Creator Content & Paywall Standards */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
          <span>Creator Content & Paywall Standards</span>
        </h2>
        <p>
          We support creator autonomy while ensuring content is safe and consensual:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
          <li><strong>Consensual Self-Depiction:</strong> Creators may only monetize photos and moments depicting themselves. Using photos of other people without written authorization is strictly prohibited.</li>
          <li><strong>No Violence or Graphic Gore:</strong> We prohibit self-harm, gore, animal cruelty, or weapons display.</li>
          <li><strong>No Deceptive Clickbait:</strong> Locked moments must honestly represent what is contained behind the paywall. Deliberate misrepresentation will result in full refunds to purchasers.</li>
        </ul>
      </section>

      {/* 5. Financial Safety & Anti-Scam Rules */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
          <span>Financial Safety & Anti-Scam Rules</span>
        </h2>
        <p>
          To prevent scams and fraudulent chargebacks:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
          <li><strong>Always Keep Transactions in Escrow:</strong> Never send direct M-PESA deposits, wire transfers, or crypto outside of SociLaLink&rsquo;s escrow system.</li>
          <li><strong>Beware of &ldquo;Emergency&rdquo; Requests:</strong> Anyone claiming an urgent emergency, fare assistance, or medical fees before meeting is almost certainly a scammer. Report them immediately.</li>
          <li><strong>No Investment Schemes:</strong> Promoting forex, crypto Ponzi schemes, multi-level marketing (MLM), or pyramid structures will result in an immediate ban.</li>
        </ul>
      </section>

      {/* 6. Community Notes & Reporting Tools */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">5</span>
          <span>Community Notes & User Reporting</span>
        </h2>
        <p>
          SociLaLink empowers members to maintain collective safety through:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <strong className="text-cyan-400 block mb-0.5">Crowdsourced Community Notes</strong>
            Community members can propose factual, objective notes on suspicious profiles or misleading moments to protect other singles.
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <strong className="text-rose-400 block mb-0.5">Instant In-App Reporting</strong>
            Tap the report button on any profile or message. Our 24/7 admin moderation console investigates reports promptly.
          </div>
        </div>
      </section>
    </LegalLayout>
  );
}
