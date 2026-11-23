import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — SociLaLink',
  description: 'Learn how SociLaLink collects, uses, protects, and handles your personal information in accordance with the Kenya Data Protection Act 2019 and global privacy standards.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Your privacy, physical safety, and personal data security are the absolute foundation of SociLaLink. Read our comprehensive data processing and protection practices below."
      lastUpdated="November 23, 2026"
      badge="Data Protection & Privacy"
    >
      {/* 1. Introduction */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
          <span>Introduction & Regulatory Framework</span>
        </h2>
        <p>
          SociLaLink (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) is committed to protecting your personal data and upholding your fundamental right to privacy. This Privacy Policy details our operational data practices across our web applications, APIs, real-time messaging, and companion services accessible at <strong>https://socilalink.me.ke</strong>.
        </p>
        <p>
          We operate in strict adherence with the <strong>Kenya Data Protection Act, 2019</strong>, regulations issued by the <strong>Office of the Data Protection Commissioner (ODPC)</strong>, and international security standards including GDPR and ISO/IEC 27001 data protection principles.
        </p>
      </section>

      {/* 2. Strict 18+ Age Verification */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
          <span>Age Restriction (Strictly 18+)</span>
        </h2>
        <p>
          SociLaLink is an adult-only dating, companion, and social lifestyle platform. Individuals under the age of 18 are legally prohibited from creating accounts, accessing content, or interacting with users on the platform.
        </p>
        <p>
          We employ mandatory date-of-birth validation during onboarding and reserve the right to demand official government ID verification (National ID or Passport) whenever an account is flagged. Any account identified as belonging to an underage user is permanently terminated with immediate purging of associated data.
        </p>
      </section>

      {/* 3. Data We Collect */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
          <span>Categories of Information We Collect</span>
        </h2>
        
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-rose-300 mb-1">A. Account & Profile Credentials</h3>
            <p className="text-xs text-slate-300">
              When registering, we collect your username, display name, email address, password (securely hashed via Argon2id), gender, relationship preferences, location city, and biographical details.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-rose-300 mb-1">B. Verified Phone Number</h3>
            <p className="text-xs text-slate-300">
              We collect your phone number normalized to Kenyan E.164 standard (e.g., +254 7XX XXX XXX). Your phone number is utilized solely for account security, OTP verification, and M-PESA escrow payouts. <strong>Your phone number is never shown publicly to other users unless you explicitly decide to share it.</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-rose-300 mb-1">C. Geolocation & Live Movement Data</h3>
            <p className="text-xs text-slate-300">
              We collect GPS coordinates only when granted explicit device permissions. We use location data to:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-400 mt-1.5 space-y-1">
              <li>Compute Haversine proximity distances between singles in Dating Discovery.</li>
              <li>Provide optional street turn-by-turn navigation paths to pinned meeting venues.</li>
              <li>Power ephemeral Live Location sharing with friends or companions. <strong>Live location sessions automatically terminate and purge upon expiry (15m, 1h, or 8h).</strong></li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-rose-300 mb-1">D. Media, Photos & Ephemeral View-Once Content</h3>
            <p className="text-xs text-slate-300">
              Photographs, moments, and media you upload are securely stored in encrypted Cloudflare R2 object storage. For <em>View-Once</em> ephemeral media, content is locked, rendered through a single-use decrypted stream, and automatically burned and permanently deleted once viewed or expired.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-rose-300 mb-1">E. Financial & M-PESA Transaction Ledger</h3>
            <p className="text-xs text-slate-300">
              We process payments via the official Safaricom Daraja Lipa Na M-PESA gateway. We store transaction IDs, checkout request IDs, amounts, and escrow status. <strong>SociLaLink does not collect, process, or store credit/debit card numbers or CVVs.</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-rose-300 mb-1">F. WebRTC Voice & Video Calling</h3>
            <p className="text-xs text-slate-300">
              In-app audio and video calls operate over peer-to-peer LiveKit WebRTC encrypted streams. <strong>SociLaLink does not record, intercept, or store the contents of your private audio or video calls.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 4. Purpose of Processing */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
          <span>Lawful Purpose & Use of Your Data</span>
        </h2>
        <p>We process your data exclusively for lawful purposes:</p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
          <li><strong>Matching & Discovery:</strong> Facilitating mutual dating matches and nearby companion discovery.</li>
          <li><strong>Escrow Safety:</strong> Safeguarding companion date payments until in-person meeting verification via the 6-digit code.</li>
          <li><strong>Fraud & Abuse Prevention:</strong> Detecting duplicate accounts, unauthorized payment callbacks, and spam.</li>
          <li><strong>Security & Authentication:</strong> Issuing encrypted session cookies, rate-limiting API endpoints, and protecting accounts against brute-force attacks.</li>
        </ul>
      </section>

      {/* 5. Data Security Standards */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">5</span>
          <span>Security Architecture</span>
        </h2>
        <p>
          We implement rigorous technical and organizational safeguards:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <strong className="text-emerald-400 block mb-0.5">Argon2id Password Hashing</strong>
            Military-grade memory-hard key derivation protecting credentials against GPU brute-forcing.
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <strong className="text-cyan-400 block mb-0.5">TLS 1.3 Transport Encryption</strong>
            Full HTTPS encryption across all API requests, WebSockets, and media transfers.
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <strong className="text-rose-400 block mb-0.5">Strict CORS & CSP Boundaries</strong>
            Restricted cross-origin resource sharing preventing unauthorized domain access.
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <strong className="text-amber-400 block mb-0.5">No Third-Party Ad Trackers</strong>
            Zero third-party tracking pixels, ad networks, or data brokers installed on the client.
          </div>
        </div>
      </section>

      {/* 6. Your Rights under the Kenya Data Protection Act */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">6</span>
          <span>Your Legal Rights (ODPC Kenya)</span>
        </h2>
        <p>
          Under the Kenya Data Protection Act 2019, you maintain enforceable rights regarding your personal information:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
          <li><strong>Right to be Informed:</strong> You have the right to know how your data is collected and processed.</li>
          <li><strong>Right of Access:</strong> You may request a machine-readable copy of your personal records and transaction history.</li>
          <li><strong>Right to Rectification:</strong> You may correct inaccurate or incomplete profile data directly via the profile editor.</li>
          <li><strong>Right to Erasure (Right to be Forgotten):</strong> You may request the permanent deletion of your account and associated media.</li>
          <li><strong>Right to Object:</strong> You can withdraw consent for location sharing or marketing communications at any time.</li>
        </ul>
        <p className="text-xs text-slate-400 pt-2">
          To exercise any of these rights, email our Data Protection Officer at <strong>privacy@socilalink.me.ke</strong>. We respond to all verified statutory requests within 14 business days.
        </p>
      </section>

      {/* 7. Changes to this Policy */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">7</span>
          <span>Modifications & Policy Updates</span>
        </h2>
        <p>
          We may update this Privacy Policy periodically to reflect technological improvements or legislative amendments by the ODPC. Any substantial revisions will be notified through in-app notices or banner announcements prior to taking effect.
        </p>
      </section>
    </LegalLayout>
  );
}
