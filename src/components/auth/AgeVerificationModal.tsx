import React, { useState, useMemo } from 'react';
import { SociLinkLogo } from '../ui/SociLinkLogo';
import {
  Calendar,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Loader2,
  Sparkles,
  Heart,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface AgeVerificationModalProps {
  onSuccess: () => void;
  confirmAge: (data: {
    dateOfBirth: string;
    gender: string;
    interestedInGenders?: string;
    relationshipIntentions?: string;
    bio?: string;
    companionRateKes?: number | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function AgeVerificationModal({ onSuccess, confirmAge }: AgeVerificationModalProps) {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | 'NON_BINARY' | 'OTHER'>('FEMALE');
  const [interestedInGenders, setInterestedInGenders] = useState<'ALL' | 'FEMALE' | 'MALE'>('ALL');
  const [relationshipIntentions, setRelationshipIntentions] = useState('Casual Hookups & Spontaneous Dates');
  const [companionRateKes, setCompanionRateKes] = useState<number | null>(null);
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate age dynamically from input
  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [dateOfBirth]);

  const isUnderage = calculatedAge !== null && calculatedAge < 18;
  const isOldEnough = calculatedAge !== null && calculatedAge >= 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!dateOfBirth) {
      setErrorMessage('Please enter your date of birth.');
      return;
    }

    if (isUnderage) {
      setErrorMessage('You must be at least 18 years old to use SociLaLink.');
      return;
    }

    if (!confirmedAdult) {
      setErrorMessage('Please confirm you are at least 18 years of age.');
      return;
    }

    setLoading(true);

    try {
      const result = await confirmAge({
        dateOfBirth,
        gender,
        interestedInGenders,
        relationshipIntentions,
        companionRateKes,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to confirm age. Please check your connection.');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  const VIBE_OPTIONS = [
    { id: 'Casual Hookups & Spontaneous Dates', label: 'Hookups & Spontaneous Dates' },
    { id: 'Late Night Drinks & Cocktails', label: 'Drinks & Nightlife Rendezvous' },
    { id: 'Verified Companion Dates', label: 'Verified Companion Dates' },
    { id: 'Open Minded / Flirting', label: 'Flirting & Seeing What Happens' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/20 shadow-2xl overflow-y-auto max-h-[92vh] no-scrollbar">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-rose-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="text-center space-y-3 mb-6 relative">
          <div className="flex items-center justify-center gap-2">
            <SociLinkLogo size="md" showText={true} />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
              18+ ONLY
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Age Verification Required</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Welcome to SociLaLink. Because our community features adult companion dates, hookups, and nightlife rendezvous, all members must verify their legal age before browsing.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Date of Birth */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <label htmlFor="dob" className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                <span>Your Date of Birth</span>
                <span className="text-rose-500">*</span>
              </label>

              {calculatedAge !== null && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                    isOldEnough
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {isOldEnough ? `${calculatedAge} yrs old (18+ Verified)` : `${calculatedAge} yrs old (Underage)`}
                </span>
              )}
            </div>

            <input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20 transition-all font-sans"
              required
            />

            {isUnderage && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium mt-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                You must be 18 years or older to enter SociLaLink.
              </p>
            )}
            <p className="text-[10px] text-slate-500">
              Your exact birthdate is encrypted and never shown publicly on your profile — only your calculated age is displayed.
            </p>
          </div>

          {/* 2. Gender Identity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">
              I identify as <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'FEMALE', label: 'Woman' },
                { id: 'MALE', label: 'Man' },
                { id: 'NON_BINARY', label: 'Non-Binary' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGender(item.id as any)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                    gender === item.id
                      ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-lg shadow-rose-500/10'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Interested In */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">
              Show me in Discovery
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ALL', label: 'Everyone' },
                { id: 'FEMALE', label: 'Women' },
                { id: 'MALE', label: 'Men' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setInterestedInGenders(item.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                    interestedInGenders === item.id
                      ? 'bg-purple-500/20 border-purple-500/60 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Relationship Intentions / Vibe */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">
              What are you looking for right now?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VIBE_OPTIONS.map((vibe) => (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => setRelationshipIntentions(vibe.id)}
                  className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                    relationshipIntentions === vibe.id
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-200'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {vibe.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Companion Rendezvous Rate (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Companion Date Fee (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-500">Visible while scrolling feed</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Skip / Open to Offers', value: null },
                { label: 'KES 2,000', value: 2000 },
                { label: 'KES 3,500', value: 3500 },
                { label: 'KES 5,000', value: 5000 },
              ].map((chip) => {
                const isSelected = companionRateKes === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setCompanionRateKes(chip.value)}
                    className={`text-[11px] py-1 px-3 rounded-full border transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. 18+ Checkbox Confirmation */}
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] cursor-pointer hover:bg-white/[0.04] transition-all">
            <input
              type="checkbox"
              checked={confirmedAdult}
              onChange={(e) => setConfirmedAdult(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-rose-500 focus:ring-rose-500/30 accent-rose-500 cursor-pointer"
            />
            <span className="text-xs text-slate-300 leading-snug">
              I certify under penalty of account termination that I am at least <strong className="text-white">18 years of age</strong> and accept the SociLaLink{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-rose-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Adult Terms of Service
              </a>,{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-rose-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>, and{' '}
              <a
                href="/guidelines"
                target="_blank"
                rel="noreferrer"
                className="text-rose-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Community Guidelines
              </a>.
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || isUnderage || !dateOfBirth || !confirmedAdult}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white font-semibold text-sm shadow-xl shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Age & Saving...</span>
              </>
            ) : (
              <>
                <span>Confirm Age & Unlock SociLaLink</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

