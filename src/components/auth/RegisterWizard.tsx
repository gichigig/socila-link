import React, { useState, useRef } from 'react';
import { SociLinkLogo } from '../ui/SociLinkLogo';
import {
  ArrowLeft,
  ArrowRight,
  User,
  AtSign,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MapPin,
  Camera,
  UploadCloud,
  Sparkles,
  Scale,
  Shield,
  ShieldCheck,
  Users,
  Check,
  ExternalLink,
  X,
} from 'lucide-react';
import { uploadMediaFile } from '@/utils/upload';

interface RegisterWizardProps {
  onBack: () => void;
  onLoginClick: () => void;
  onSuccess: (userData: any) => void;
}

export function RegisterWizard({ onBack, onLoginClick, onSuccess }: RegisterWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Credentials
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+254');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | 'NON_BINARY' | 'OTHER'>('FEMALE');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'guidelines' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Step 3: Dating Preferences & Bio
  const [locationCity, setLocationCity] = useState('Nairobi');
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Travel', 'Music', 'Photography']);
  const [companionRateKes, setCompanionRateKes] = useState<number | null>(null);

  // Step 4: Photo
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const STARTER_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
  ];

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    setAvatarUploading(true);
    setErrorMessage('');

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);

    try {
      const uploadRes = await uploadMediaFile(file, 'avatars');
      if (uploadRes.success && uploadRes.publicUrl) {
        setAvatarUrl(uploadRes.publicUrl);
      } else {
        setErrorMessage(uploadRes.error || 'Failed to upload photo from device');
      }
    } catch {
      setErrorMessage('Error uploading photo from device');
    } finally {
      setAvatarUploading(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  const availableInterests = [
    'Travel',
    'Music',
    'Photography',
    'Fitness',
    'Art & Design',
    'Tech & Coding',
    'Foodie',
    'Hiking',
    'Coffee',
    'Nightlife',
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleGoogleAuth = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://socilalink-api-ab186685252b.herokuapp.com';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    window.location.href = `${apiUrl}/api/v1/auth/google?origin=${encodeURIComponent(origin)}`;
  };

  // Handle Step 1 Registration Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Check 18+ client-side first
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const minAge = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      if (dob > minAge) {
        setErrorMessage('You must be at least 18 years old to join SociLaLink.');
        return;
      }
    }

    if (!termsAccepted || !privacyAccepted || !guidelinesAccepted) {
      setErrorMessage('Please review and accept the Terms, Privacy Policy, and Community Guidelines to proceed.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          username,
          email,
          phone,
          dateOfBirth,
          password,
          gender,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorDetail = data.details ? data.details.map((d: any) => d.message).join('. ') : data.error;
        setErrorMessage(errorDetail || 'Registration failed.');
        setLoading(false);
        return;
      }

      setRegisteredUser(data.data.user);

      // Trigger OTP dispatch
      await fetch('/api/v1/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email, type: 'EMAIL_VERIFY' }),
      });
      setOtpSent(true);

      setStep(2); // Advance to OTP verification
    } catch {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: email,
          code: otpCode,
          type: 'EMAIL_VERIFY',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Verification code failed. Please check the 6 digits.');
        setLoading(false);
        return;
      }

      setStep(3); // Advance to Profile details
    } catch {
      setErrorMessage('Verification failed due to connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3 & 4 Completion
  const handleCompleteProfile = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Update profile with bio, city, and optional companion rate
      await fetch('/api/v1/profiles/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio || 'Excited to connect on SociLaLink!',
          locationCity,
          avatarUrl,
          companionRateKes,
        }),
      });

      // Update preferences with interests
      await fetch('/api/v1/profiles/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestedInGenders: 'ALL',
          relationshipIntentions: selectedInterests.join(', '),
        }),
      });

      onSuccess({
        ...registeredUser,
        profile: {
          displayName,
          avatarUrl,
          bio,
          locationCity,
        },
      });
    } catch {
      setErrorMessage('Failed to save profile. Completing registration anyway.');
      onSuccess(registeredUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-between min-h-[680px] h-full w-full max-w-sm mx-auto p-6 bg-[#0B0E14] text-white rounded-3xl overflow-hidden shadow-2xl border border-gray-800/40">
      {/* Top Header & Progress Indicator */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <button
            onClick={() => {
              if (step > 1) setStep((step - 1) as any);
              else onBack();
            }}
            className="p-2 -ml-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <SociLinkLogo size="sm" showText={true} />
          <span className="text-[11px] font-mono text-gray-400">Step {step}/4</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full gradient-pink transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Basic Credentials */}
        {step === 1 && (
          <div>
            <div className="pb-3 text-left">
              <h2 className="text-xl font-bold tracking-tight text-white">Create Account</h2>
              <p className="text-xs text-gray-400 mt-0.5">Strict 18+ policy for real dating discovery</p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-500">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Full name"
                    className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-500">
                    <AtSign className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Username"
                    className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email address"
                  className="w-full py-2.5 pl-10 pr-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
                />
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+254 700 000 000"
                  className="w-full py-2.5 pl-10 pr-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="w-full py-2.5 pl-9 pr-2 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full py-2.5 px-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white focus:outline-none focus:border-[#F43F5E]"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="NON_BINARY">Non-Binary</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-gray-500">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password (min 8 chars, 1 uppercase, 1 digit)"
                  className="w-full py-2.5 pl-10 pr-10 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Legal & Safety Agreement Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white tracking-wide">Legal & Safety Agreement</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allCurrentlySelected = termsAccepted && privacyAccepted && guidelinesAccepted;
                      setTermsAccepted(!allCurrentlySelected);
                      setPrivacyAccepted(!allCurrentlySelected);
                      setGuidelinesAccepted(!allCurrentlySelected);
                    }}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    {termsAccepted && privacyAccepted && guidelinesAccepted ? 'Deselect All' : 'Accept All'}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Please review our policies and community standards before completing registration:
                </p>

                {/* Quick Document Reader Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('terms')}
                    className="py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition flex flex-col items-center gap-0.5 cursor-pointer text-center group"
                  >
                    <Scale className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition" />
                    <span>Terms (18+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('privacy')}
                    className="py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition flex flex-col items-center gap-0.5 cursor-pointer text-center group"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
                    <span>Privacy (ODPC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('guidelines')}
                    className="py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition flex flex-col items-center gap-0.5 cursor-pointer text-center group"
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
                    <span>Guidelines</span>
                  </button>
                </div>

                {/* Granular Agreement Checkboxes */}
                <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                  {/* 1. Terms Checkbox */}
                  <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-700 text-rose-500 focus:ring-0 bg-[#1A202C] accent-rose-500 cursor-pointer shrink-0"
                    />
                    <span className="leading-tight">
                      I certify I am <strong>18+</strong> and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setActiveLegalModal('terms'); }}
                        className="text-rose-400 underline hover:text-rose-300 font-medium"
                      >
                        Terms of Service
                      </button>{' '}
                      (M-PESA escrow 90/10 split & 6-digit code rules).
                    </span>
                  </label>

                  {/* 2. Privacy Checkbox */}
                  <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-700 text-rose-500 focus:ring-0 bg-[#1A202C] accent-rose-500 cursor-pointer shrink-0"
                    />
                    <span className="leading-tight">
                      I acknowledge the{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setActiveLegalModal('privacy'); }}
                        className="text-emerald-400 underline hover:text-emerald-300 font-medium"
                      >
                        Privacy Policy
                      </button>{' '}
                      and consent to ODPC-compliant data & ephemeral location processing.
                    </span>
                  </label>

                  {/* 3. Guidelines Checkbox */}
                  <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={guidelinesAccepted}
                      onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-700 text-rose-500 focus:ring-0 bg-[#1A202C] accent-rose-500 cursor-pointer shrink-0"
                    />
                    <span className="leading-tight">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setActiveLegalModal('guidelines'); }}
                        className="text-cyan-400 underline hover:text-cyan-300 font-medium"
                      >
                        Community Guidelines
                      </button>{' '}
                      (zero tolerance for harassment or NCII, and committing to safe public meetups).
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !(termsAccepted && privacyAccepted && guidelinesAccepted)}
                className="w-full mt-2 py-3 px-6 rounded-full font-semibold text-xs tracking-wide gradient-pink shadow-[0_6px_20px_rgba(225,29,72,0.35)] hover:shadow-[0_8px_25px_rgba(225,29,72,0.5)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#0B0E14] px-2 text-gray-500 font-medium">or continue with</span>
              </div>
            </div>

            {/* Google Signup Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1A202C] border border-gray-800 text-xs text-gray-200 hover:bg-[#252D3D] hover:border-gray-700 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-medium">Sign up with Google</span>
            </button>
          </div>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 2 && (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[#F43F5E]">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Verify Your Account</h2>
            <p className="text-xs text-gray-400 mt-1 px-4">
              We sent a 6-digit security code to <br />
              <span className="text-white font-medium">{email}</span>
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="1 2 3 4 5 6"
                className="w-48 mx-auto py-3 text-center tracking-[0.5em] font-mono text-xl font-bold bg-[#1A202C] border-2 border-gray-700/80 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F43F5E] transition"
              />

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 px-6 rounded-full font-semibold text-xs tracking-wide gradient-pink shadow-[0_6px_20px_rgba(225,29,72,0.35)] hover:shadow-[0_8px_25px_rgba(225,29,72,0.5)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Continue</span>}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: Dating Bio & Interests */}
        {step === 3 && (
          <div>
            <div className="pb-3 text-left">
              <h2 className="text-xl font-bold tracking-tight text-white">Dating & Lifestyle</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tell others who you are</p>
            </div>

            <div className="space-y-3">
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="Your City (e.g. Nairobi, Mombasa)"
                  className="w-full py-2.5 pl-10 pr-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
                />
              </div>

              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio (e.g. Software engineer, loves sunset photography, Afro-fusion music & weekend road trips)"
                className="w-full py-2 px-3 text-xs bg-[#1A202C] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E] resize-none"
              />

              <div>
                <p className="text-[11px] font-medium text-gray-400 mb-1.5">Pick up to 5 interests:</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`text-[11px] py-1 px-3 rounded-full border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#F43F5E] border-[#F43F5E] text-white font-medium'
                            : 'bg-[#1A202C] border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Companion Rendezvous Rate (Optional) */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Companion Date Rate (Optional):</span>
                  </p>
                  <span className="text-[10px] text-gray-500">Set or skip</span>
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
                        className={`text-[11px] py-1 px-2.5 rounded-full border transition cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                            : 'bg-[#1A202C] border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full py-3.5 px-6 rounded-full font-semibold text-xs tracking-wide gradient-pink shadow-[0_6px_20px_rgba(225,29,72,0.35)] hover:shadow-[0_8px_25px_rgba(225,29,72,0.5)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Next: Profile Photo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Profile Picture */}
        {step === 4 && (
          <div className="text-center py-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Profile Photo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose your primary photo from your device</p>

            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              onChange={handleAvatarFileSelected}
              className="hidden"
            />

            <div
              onClick={() => !avatarUploading && avatarInputRef.current?.click()}
              className="my-5 relative w-36 h-36 mx-auto rounded-3xl overflow-hidden border-2 border-[#F43F5E] shadow-[0_0_25px_rgba(244,63,94,0.35)] cursor-pointer group bg-gray-900"
            >
              <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                <Camera className="w-7 h-7" />
                <span className="text-[11px] font-semibold">Change Photo</span>
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1.5 text-white">
                  <Loader2 className="w-7 h-7 text-[#F43F5E] animate-spin" />
                  <span className="text-[10px]">Uploading...</span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
              className="mb-4 inline-flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white border border-gray-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {avatarUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#F43F5E]" />
              ) : (
                <UploadCloud className="w-4 h-4 text-[#F43F5E]" />
              )}
              <span>{avatarUploading ? 'Uploading to cloud...' : 'Choose Photo from Device'}</span>
            </button>

            {/* Quick Starter Avatars */}
            <div className="mb-5 pt-3 border-t border-gray-800/80">
              <span className="text-[10px] text-gray-500 block mb-2">Or choose a starter avatar</span>
              <div className="flex justify-center gap-2.5">
                {STARTER_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                      avatarUrl === url ? 'border-[#F43F5E] scale-110 shadow-sm shadow-[#F43F5E]' : 'border-gray-700 opacity-60'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteProfile}
              disabled={loading || avatarUploading}
              className="w-full py-3.5 px-6 rounded-full font-semibold text-xs tracking-wide gradient-pink shadow-[0_6px_20px_rgba(225,29,72,0.35)] hover:shadow-[0_8px_25px_rgba(225,29,72,0.5)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finalizing Profile...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete & Start Exploring</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 text-center text-xs text-gray-400">
        Already have an account?{' '}
        <button
          onClick={onLoginClick}
          className="font-semibold text-[#F43F5E] hover:underline cursor-pointer ml-1"
        >
          Log in
        </button>
      </div>

      {/* IN-WIZARD LEGAL READER MODAL */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0F1420] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                {activeLegalModal === 'terms' && <Scale className="w-5 h-5 text-rose-400" />}
                {activeLegalModal === 'privacy' && <Shield className="w-5 h-5 text-emerald-400" />}
                {activeLegalModal === 'guidelines' && <Users className="w-5 h-5 text-cyan-400" />}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {activeLegalModal === 'terms' && 'Terms of Service (Adult 18+)'}
                    {activeLegalModal === 'privacy' && 'Privacy Policy (Kenya ODPC)'}
                    {activeLegalModal === 'guidelines' && 'Community Safety Guidelines'}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Official SociLaLink Platform Standards
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Document Content */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs text-slate-300 leading-relaxed no-scrollbar">
              {activeLegalModal === 'terms' && (
                <>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold">
                    Strict 18+ Requirement: By registering, you legally certify that you are 18 years of age or older.
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">1. In-Person Companion Dates & Escrow Protocol</h4>
                    <p className="text-slate-400">
                      When booking a companion date, funds are locked in an isolated escrow ledger. Escrow is released exclusively when both parties meet in person and the booking party provides the 6-digit verification code. A 90/10 platform split applies (90% to companion, 10% platform facilitation fee).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">2. Cancellations & Disputes</h4>
                    <p className="text-slate-400">
                      If cancelled before the scheduled time, 100% of escrowed funds revert to your SociLaLink wallet. Funds released via the 6-digit code are final and non-refundable.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">3. Creator Content Ownership</h4>
                    <p className="text-slate-400">
                      Paid media and view-once moments are licensed for personal viewing only. Screenshotting, recording, or redistributing content outside the platform is strictly prohibited.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">4. Governing Law</h4>
                    <p className="text-slate-400">
                      This contract is governed under the Laws of the Republic of Kenya.
                    </p>
                  </div>
                </>
              )}

              {activeLegalModal === 'privacy' && (
                <>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
                    Kenya Data Protection Act 2019: We process your data lawfully and transparently under the authority of the ODPC.
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">1. Phone & Personal Data Privacy</h4>
                    <p className="text-slate-400">
                      Your phone number is used exclusively for account verification, login security, and M-PESA escrow transactions. It is never displayed publicly without your consent.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">2. Geolocation & Ephemeral Purging</h4>
                    <p className="text-slate-400">
                      GPS coordinates are accessed only with your permission for distance matching and live navigation. Live location streams are temporary and automatically destroyed upon expiration.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">3. Calls & Media Privacy</h4>
                    <p className="text-slate-400">
                      In-app voice and video calls operate via encrypted LiveKit WebRTC peer-to-peer streams and are never recorded or listened to. View-once moments auto-burn after viewing.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">4. Your Statutory Rights</h4>
                    <p className="text-slate-400">
                      You have the right to access, rectify, and permanently delete your data at any time by contacting privacy@socilalink.me.ke.
                    </p>
                  </div>
                </>
              )}

              {activeLegalModal === 'guidelines' && (
                <>
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold">
                    Zero Tolerance: Underage activity, non-consensual imagery (NCII), extortion, and violence lead to permanent bans and police referral.
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">1. Golden Rules for Meeting In-Person</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Always meet in public venues (cafes, restaurants, lounges).</li>
                      <li>Share your live location with a trusted friend.</li>
                      <li>Never reveal your 6-digit verification code before meeting your date in person.</li>
                      <li>Control your own transportation to and from meetings.</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">2. Respect & Mutual Consent</h4>
                    <p className="text-slate-400">
                      No harassment, stalking, or unsolicited explicit material. Consent can be withdrawn at any time.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-xs">3. Financial Integrity</h4>
                    <p className="text-slate-400">
                      Never transfer funds outside SociLaLink escrow. Beware of anyone asking for advance travel or medical money before meeting.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <a
                href={
                  activeLegalModal === 'terms'
                    ? '/terms'
                    : activeLegalModal === 'privacy'
                    ? '/privacy'
                    : '/guidelines'
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 underline"
              >
                <span>Full Web Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => {
                  if (activeLegalModal === 'terms') setTermsAccepted(true);
                  if (activeLegalModal === 'privacy') setPrivacyAccepted(true);
                  if (activeLegalModal === 'guidelines') setGuidelinesAccepted(true);
                  setActiveLegalModal(null);
                }}
                className="py-2 px-4 rounded-xl gradient-brand text-white font-bold text-xs shadow-md shadow-rose-500/25 hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {activeLegalModal === 'terms' && 'I Accept Terms of Service'}
                  {activeLegalModal === 'privacy' && 'I Accept Privacy Policy'}
                  {activeLegalModal === 'guidelines' && 'I Accept Guidelines'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

