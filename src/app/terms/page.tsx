import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — SociLaLink',
  description: 'The binding legal agreement governing the use of SociLaLink dating discovery, companion date escrow, creator monetization, and messaging services.',
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Please read these Terms of Service carefully before creating an account or using SociLaLink. By registering or using the Platform, you enter into a legally binding agreement."
      lastUpdated="November 23, 2026"
      badge="Legal Contract"
    >
      {/* 1. Binding Agreement & 18+ Eligibility */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
          <span>Agreement to Terms & Strict 18+ Eligibility</span>
        </h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and SociLaLink Inc. (&ldquo;SociLaLink&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) governing your access to and use of <strong>https://socilalink.me.ke</strong> and all associated APIs, messaging systems, and financial escrow tools.
        </p>
        <p>
          <strong>STRICT AGE REQUIREMENT:</strong> You must be at least eighteen (18) years of age to register or use SociLaLink. By accessing the Platform, you affirm and warrant that you are of legal age under the laws of your jurisdiction and the Republic of Kenya. Providing false birth date information constitutes fraud and warrants immediate account termination.
        </p>
      </section>

      {/* 2. Account Security & Verification */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
          <span>User Accounts & Security</span>
        </h2>
        <p>
          You are responsible for maintaining the confidentiality of your login credentials and session tokens. You agree to immediately notify SociLaLink of any unauthorized access to your account.
        </p>
        <p>
          Each individual may register only one active account. Multiple accounts created for fraudulent purposes, impersonation, or circumventing suspensions are strictly prohibited and subject to immediate blacklisting.
        </p>
      </section>

      {/* 3. Companion Dates & Escrow Protocol */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
          <span>Companion Dates, Escrow & Payment Protocol</span>
        </h2>
        <p>
          SociLaLink provides an escrow mechanism designed to protect both meeting parties during in-person companion dates:
        </p>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-emerald-400 mb-1">A. Escrow Locking & 90/10 Split</h3>
            <p className="text-xs text-slate-300">
              When a companion date is scheduled and funded via M-PESA STK or wallet balance, funds are securely held in an isolated escrow ledger. Upon successful verification, <strong>90% of the funds are transferred to the companion&rsquo;s wallet</strong> and <strong>10% is retained as a platform service fee</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-emerald-400 mb-1">B. The 6-Digit In-Person Verification Code</h3>
            <p className="text-xs text-slate-300">
              The booking party receives a unique, cryptographically generated <strong>6-digit verification code</strong>. This code must <strong>NEVER</strong> be shared online, in chats, or over the phone. It should only be provided verbally in person once both parties have met safely at the designated public venue.
            </p>
            <p className="text-xs text-rose-400 font-medium mt-1">
              Warning: Once the companion submits the valid 6-digit code on their device, the escrow release is final, instantaneous, and irrevocable.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-emerald-400 mb-1">C. Cancellation & Refund Policy</h3>
            <p className="text-xs text-slate-300">
              If a companion date is cancelled prior to the meeting time by either party, 100% of the escrowed funds are automatically returned to the booking user&rsquo;s spendable SociLaLink wallet. In the event of a no-show or safety dispute, our administrative moderation team investigates before releasing or refunding escrowed funds.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-amber-400 mb-1">D. In-Person Meeting Safety Disclaimer</h3>
            <p className="text-xs text-slate-300">
              SociLaLink is a software facilitator and not an employer, agency, or guarantor of any user&rsquo;s personal character. Users are autonomous adults who meet of their own free will. You are strictly advised to meet in well-lit public places, arrange your own transportation, and utilize our in-app <em>Share Live Location</em> feature with trusted contacts.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Creator Media & Ephemeral Content */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
          <span>Paid Moments, Ephemeral Media & IP Rights</span>
        </h2>
        <p>
          Creators retain all intellectual property rights to the content, photographs, and moments they publish on SociLaLink. When you pay to unlock a moment, you are granted a limited, personal, revocable, non-transferable license to view the media within the platform.
        </p>
        <p>
          <strong>PROHIBITION OF RECORDING & REDISTRIBUTION:</strong> Taking screenshots, capturing screen recordings, scraping, or redistributing creator content or view-once ephemeral media outside SociLaLink is strictly illegal and constitutes copyright infringement and breach of contract. Violators face immediate permanent termination and potential civil litigation.
        </p>
      </section>

      {/* 5. Wallet & M-PESA B2C Withdrawals */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">5</span>
          <span>Digital Wallet & M-PESA Withdrawals</span>
        </h2>
        <p>
          Wallet balances represent internal platform credits denominated in Kenyan Shillings (KES). Creators may initiate automated B2C withdrawals to their registered Safaricom M-PESA phone number, subject to:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
          <li>Minimum withdrawal threshold of KES 500.</li>
          <li>Standard Safaricom Daraja B2C network disbursement fees deducted at payout.</li>
          <li>Security hold period (up to 24 hours) for newly opened accounts or flagged suspicious transaction spikes.</li>
        </ul>
      </section>

      {/* 6. Prohibited Activities */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">6</span>
          <span>Prohibited Conduct</span>
        </h2>
        <p>You agree not to engage in any of the following activities on SociLaLink:</p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
          <li>Any interaction involving underage individuals, child exploitation, or grooming.</li>
          <li>Commercial prostitution, sex trafficking, or non-consensual sexual exploitation.</li>
          <li>Non-consensual sharing of intimate images (NCII / revenge porn).</li>
          <li>Extortion, blackmail, financial fraud, impersonation, or phishing.</li>
          <li>Soliciting off-platform payment transfers to bypass escrow protections.</li>
          <li>Harassment, stalking, hate speech, threats, or intimidation of any member.</li>
        </ul>
      </section>

      {/* 7. Limitation of Liability */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">7</span>
          <span>Limitation of Liability</span>
        </h2>
        <p>
          To the maximum extent permitted by applicable law, SociLaLink and its directors, employees, and partners shall not be liable for any indirect, incidental, punitive, or consequential damages arising from:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
          <li>Your in-person conduct or interactions with other users.</li>
          <li>Any unauthorized access to or alteration of your transmissions or data.</li>
          <li>Temporary service downtime, telecommunications failures, or payment gateway delays.</li>
        </ul>
      </section>

      {/* 8. Governing Law & Dispute Resolution */}
      <section className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">8</span>
          <span>Governing Law & Jurisdiction</span>
        </h2>
        <p>
          These Terms are governed by and construed in accordance with the <strong>Laws of the Republic of Kenya</strong>. Any dispute, controversy, or claim arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in Nairobi, Kenya.
        </p>
      </section>
    </LegalLayout>
  );
}
