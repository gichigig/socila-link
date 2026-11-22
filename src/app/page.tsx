'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { RegisterWizard } from '@/components/auth/RegisterWizard';
import { ProfileEditorModal } from '@/components/profile/ProfileEditorModal';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { AgeVerificationModal } from '@/components/auth/AgeVerificationModal';
import { CreateDateInviteModal } from '@/components/dates/CreateDateInviteModal';
import { DiscoverScreen } from '@/components/discover/DiscoverScreen';
import { MatchModal } from '@/components/discover/MatchModal';
import { FeedScreen } from '@/components/feed/FeedScreen';
import { MessagesScreen } from '@/components/messages/MessagesScreen';
import { DatesScreen } from '@/components/dates/DatesScreen';
import { WalletScreen } from '@/components/wallet/WalletScreen';
import { AdminDashboardModal } from '@/components/admin/AdminDashboardModal';
import { SociLinkLogo as SociLaLinkLogo } from '@/components/ui/SociLinkLogo';
import {
  LogOut,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  MapPin,
  Calendar,
  Lock,
  Database,
  Heart,
  MessageCircle,
  Flame,
  User as UserIcon,
  Edit3,
  Wallet as WalletIcon,
  LogIn,
  UserPlus,
  Compass,
  ArrowRight,
  Shield,
  Zap,
  HelpCircle,
  Bell,
  Search,
  X,
} from 'lucide-react';

type TabType = 'discover' | 'feed' | 'messages' | 'dates' | 'profile' | 'wallet';

function GuestTabCard({
  icon: Icon,
  title,
  subtitle,
  bullets,
  onLogin,
  onRegister,
}: {
  icon: any;
  title: string;
  subtitle: string;
  bullets: string[];
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center justify-center my-auto py-10 px-4 space-y-4 animate-fade-in max-w-md mx-auto">
      <div className="w-18 h-18 rounded-3xl gradient-brand flex items-center justify-center text-white shadow-xl shadow-rose-500/35">
        <Icon className="w-9 h-9" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
      </div>
      <div className="w-full glass-card rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-300 border border-white/10">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="font-medium">{b}</span>
          </div>
        ))}
      </div>
      <div className="w-full space-y-2.5 pt-2">
        <button
          onClick={onRegister}
          className="w-full py-3.5 rounded-2xl font-bold text-xs gradient-brand text-white shadow-lg shadow-rose-500/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Free SociLaLink Account</span>
        </button>
        <button
          onClick={onLogin}
          className="w-full py-3 rounded-2xl font-semibold text-xs text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition border border-white/10 cursor-pointer flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Already a member? Log in</span>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    user,
    loading,
    logout,
    isAuthenticated,
    refreshUser,
    confirmAge,
    unreadMessagesCount,
    activeDatesCount,
    refreshActiveDatesCount,
  } = useAuth();
  const { socket } = useSocket();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('discover');

  // Synchronize Companion Dates badge on real-time date and payment events
  useEffect(() => {
    if (!socket) return;
    const handleDatesUpdate = () => {
      refreshActiveDatesCount();
    };
    socket.on('date:updated', handleDatesUpdate);
    socket.on('payment:confirmed', handleDatesUpdate);
    return () => {
      socket.off('date:updated', handleDatesUpdate);
      socket.off('payment:confirmed', handleDatesUpdate);
    };
  }, [socket, refreshActiveDatesCount]);

  // Restore active tab from local cache on mount so user stays on same tab on refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('socilalink_active_tab') as TabType | null;
      if (
        savedTab &&
        ['discover', 'feed', 'messages', 'dates', 'profile', 'wallet'].includes(savedTab)
      ) {
        setActiveTab(savedTab);
      }
    }
  }, []);

  // Persist active tab to local cache whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      localStorage.setItem('socilalink_active_tab', activeTab);
    }
  }, [activeTab]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [selectedChatPartnerId, setSelectedChatPartnerId] = useState<string | null>(null);
  const [dateModalPartner, setDateModalPartner] = useState<any | null>(null);
  const [isDateInviteModalOpen, setIsDateInviteModalOpen] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle OAuth redirect query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (params.get('auth_success') === 'true') {
        const handleOAuthSync = async () => {
          if (token) {
            localStorage.setItem('auth_token', token);
            document.cookie = `auth_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
            try {
              await fetch('/api/v1/auth/session-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
              });
            } catch (err) {
              console.error('Session sync error:', err);
            }
          }
          await refreshUser();
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        };
        handleOAuthSync();
      } else if (params.get('auth_error')) {
        const error = params.get('auth_error');
        setAuthError(
          error === 'internal_error'
            ? 'Account setup failed: Server database operation failed. Ensure PostgreSQL is active.'
            : error === 'token_exchange_failed'
            ? 'Google verification failed. Please try signing in again.'
            : error === 'missing_credentials'
            ? 'Google OAuth credentials are not properly configured on server.'
            : `Authentication error: ${error}`
        );
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [refreshUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#07090E] text-white">
        <div className="flex flex-col items-center gap-4">
          <SociLaLinkLogo size="xl" showText={true} />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase animate-pulse">
            Connecting to SociLaLink...
          </p>
        </div>
      </div>
    );
  }

  // Navigation Items Config
  const NAV_ITEMS: { id: TabType; label: string; icon: any; badge?: string }[] = [
    { id: 'discover', label: 'Discover & Match', icon: Heart },
    { id: 'feed', label: 'Moments Feed', icon: Flame, badge: 'Hot' },
    {
      id: 'messages',
      label: 'Conversations',
      icon: MessageCircle,
      badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)) : undefined,
    },
    {
      id: 'dates',
      label: 'Companion Dates',
      icon: Calendar,
      badge: activeDatesCount > 0 ? (activeDatesCount > 99 ? '99+' : String(activeDatesCount)) : undefined,
    },
    { id: 'wallet', label: 'M-PESA Wallet', icon: WalletIcon },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#07090E] text-slate-100 flex flex-col justify-start lg:justify-center p-0 lg:p-3 xl:p-4 relative overflow-hidden ambient-mesh select-none">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none gradient-glow opacity-80" />

      {/* Auth Error Alert Toast */}
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs shadow-2xl backdrop-blur-xl animate-fade-in max-w-md">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1 font-medium">{authError}</span>
          <button
            onClick={() => setAuthError(null)}
            className="p-1 rounded-lg hover:bg-rose-900/50 text-rose-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container: Mobile Full Canvas (< lg) & Expanded Desktop Canvas (>= lg) */}
      <div className="relative w-full max-w-full lg:max-w-none mx-auto h-full flex flex-col lg:flex-row gap-0 lg:gap-3 xl:gap-4 p-0 overflow-hidden">
        
        {/* ======================================================== */}
        {/* 1. DESKTOP PERMANENT LEFT SIDEBAR (>= lg screens)       */}
        {/* ======================================================== */}
        <aside className="hidden lg:flex w-64 xl:w-72 2xl:w-80 shrink-0 flex-col justify-between glass-panel rounded-3xl p-4 border border-white/10 shadow-2xl relative z-20 overflow-y-auto no-scrollbar">
          {/* Top Brand & Status */}
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="cursor-pointer" onClick={() => setActiveTab('discover')}>
                <SociLaLinkLogo size="md" showText={true} />
              </div>
              {isAuthenticated ? (
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                  Guest
                </span>
              )}
            </div>

            {/* User Mini-Profile or Guest Card */}
            {isAuthenticated && user ? (
              <div className="p-3.5 rounded-2xl glass-card border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-rose-500/40 shrink-0">
                    <img
                      src={user.profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white truncate">
                        {user.profile?.displayName || user.username}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 fill-cyan-400/20" />
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">@{user.username}</span>
                  </div>
                </div>

                {/* Quick Wallet Balance Pill */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <WalletIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-400">
                      KES {(user.wallet?.balanceKes || 0).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    M-PESA Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl glass-card border border-white/10 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-white">Join SociLaLink</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Connect, match, and book verified companion dates in Nairobi.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setAuthModal('register')}
                    className="w-full py-2 px-3 rounded-xl gradient-brand text-white text-xs font-bold shadow-md shadow-rose-500/20 hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </button>
                  <button
                    onClick={() => setAuthModal('login')}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold transition border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Log In</span>
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Navigation Links */}
            <nav className="space-y-1 pt-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                      isActive
                        ? 'gradient-brand text-white shadow-lg shadow-rose-500/25 scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white fill-white/20' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center justify-center leading-none transition-all ${
                          isActive
                            ? 'bg-white text-rose-600 shadow-md shadow-black/25 ring-1 ring-white/50'
                            : item.id === 'messages' || item.id === 'dates'
                            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/50 animate-pulse'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Badges & Admin Access */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Admin Moderation</span>
              </button>
            )}

            {/* Trust Seals */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Argon2id Encrypted</span>
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-500" />
                <span>M-PESA Escrow</span>
              </span>
            </div>

            {isAuthenticated && (
              <button
                onClick={logout}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* 2. CENTER STAGE / MAIN VIEWPORT CANVAS                   */}
        {/* ======================================================== */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full bg-[#0A0D17]/90 rounded-none lg:rounded-3xl overflow-hidden shadow-2xl border-0 lg:border border-white/[0.08] backdrop-blur-2xl relative p-2 sm:p-3 lg:p-4">
          
          {/* MOBILE TOP APP HEADER (< lg only) */}
          <header className="lg:hidden shrink-0 flex items-center justify-between pb-2.5 pt-1 px-1 border-b border-white/[0.08] z-30 bg-[#0A0D17]/85 backdrop-blur-md">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('discover')}>
              <SociLaLinkLogo size="sm" showText={true} />
              {!isAuthenticated ? (
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                  Guest
                </span>
              ) : (
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => setAuthModal('login')}
                    className="py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition border border-white/10 cursor-pointer"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => setAuthModal('register')}
                    className="py-1.5 px-3.5 rounded-xl text-xs font-bold gradient-brand text-white shadow-md shadow-rose-500/25 hover:brightness-110 active:scale-95 transition cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('wallet')}
                    className="py-1 px-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center gap-1.5 text-xs font-bold text-emerald-400 transition cursor-pointer"
                    title="Open M-PESA Wallet"
                  >
                    <WalletIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>KES {(user?.wallet?.balanceKes || 0).toLocaleString()}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-8 h-8 rounded-full overflow-hidden border border-rose-500/40 hover:scale-105 transition cursor-pointer"
                  >
                    <img
                      src={user?.profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </>
              )}
            </div>
          </header>

          {/* DESKTOP STAGE TOP TITLE BAR (>= lg only) */}
          <div className="hidden lg:flex items-center justify-between pb-2 mb-1.5 shrink-0 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                {activeTab === 'discover' && <span>Dating Discovery</span>}
                {activeTab === 'feed' && <span>Moments Feed</span>}
                {activeTab === 'messages' && <span>Private Conversations</span>}
                {activeTab === 'dates' && <span>Companion Dates & Escrow</span>}
                {activeTab === 'wallet' && <span>Financial Ledger & M-PESA</span>}
                {activeTab === 'profile' && <span>My Creator Profile</span>}
              </h1>
              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                {user?.profile?.locationCity || 'Nairobi, Kenya'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                {activeTab === 'discover' && 'Browse profiles • Tap to text instantly'}
                {activeTab === 'feed' && 'Explore moments from verified creators'}
                {activeTab === 'dates' && 'Escrow funds unlocked via 6-digit code'}
                {activeTab === 'wallet' && 'Instant Safaricom Daraja STK Push'}
              </span>
            </div>
          </div>

          {/* MAIN BODY CONTENT VIEW */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden py-0">
            {/* 1. DISCOVER TAB */}
            {activeTab === 'discover' && (
              <DiscoverScreen
                onMatch={(match) => setActiveMatch(match)}
                isGuest={!isAuthenticated}
                onRequestAuth={() => setAuthModal('register')}
                showEmbeddedHeader={false}
                onNavigateToDates={(candidate) => {
                  if (candidate) {
                    setDateModalPartner(candidate);
                    setIsDateInviteModalOpen(true);
                  } else {
                    setActiveTab('dates');
                  }
                }}
                onStartChat={(partnerId) => {
                  setSelectedChatPartnerId(partnerId);
                  setActiveTab('messages');
                }}
                onOpenProfile={(id) => setViewingProfileUserId(id)}
              />
            )}

            {/* 2. FEED TAB */}
            {activeTab === 'feed' && (
              <div className="w-full max-w-xl mx-auto h-full flex flex-col overflow-hidden">
                <FeedScreen
                  onRequestAuth={() => setAuthModal('register')}
                  onOpenProfile={(id) => setViewingProfileUserId(id)}
                />
              </div>
            )}

            {/* 3. MESSAGES TAB */}
            {activeTab === 'messages' && (
              isAuthenticated ? (
                <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
                  <MessagesScreen
                    initialPartnerId={selectedChatPartnerId}
                    onExploreMatches={() => setActiveTab('discover')}
                    onOpenDateInvite={(partner) => {
                      setDateModalPartner(partner);
                      setIsDateInviteModalOpen(true);
                    }}
                    onOpenProfile={(id) => setViewingProfileUserId(id)}
                  />
                </div>
              ) : (
                <GuestTabCard
                  icon={MessageCircle}
                  title="Private Messaging & Locked Media"
                  subtitle="Chat directly with mutual matches, exchange real-time messages, and unlock creator paywalls."
                  bullets={[
                    'Encrypted 1-on-1 private messaging stream',
                    'Exclusive creator locked media with instant M-PESA unlock',
                    'View-once ephemeral media with auto-burn timer',
                  ]}
                  onLogin={() => setAuthModal('login')}
                  onRegister={() => setAuthModal('register')}
                />
              )
            )}

            {/* 4. DATES TAB */}
            {activeTab === 'dates' && (
              isAuthenticated ? (
                <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
                  <DatesScreen />
                </div>
              ) : (
                <GuestTabCard
                  icon={Calendar}
                  title="Companion Dates & Escrow"
                  subtitle="Book verified companion meetings with double-entry M-PESA escrow security."
                  bullets={[
                    'Verified companion booking schedule & rates',
                    'Safe escrow lock with zero pre-release risk',
                    'In-person 6-digit verification code unlock (90/10 split)',
                  ]}
                  onLogin={() => setAuthModal('login')}
                  onRegister={() => setAuthModal('register')}
                />
              )
            )}

            {/* 5. WALLET TAB */}
            {activeTab === 'wallet' && (
              isAuthenticated ? (
                <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
                  <WalletScreen />
                </div>
              ) : (
                <GuestTabCard
                  icon={WalletIcon}
                  title="SociLaLink M-PESA Wallet"
                  subtitle="Manage your spendable balance, Daraja STK deposits, and companion payouts."
                  bullets={[
                    'Instant Safaricom Daraja Lipa Na M-PESA STK Push',
                    'Automated escrow holding and release tracking',
                    'Double-entry transaction audit log',
                  ]}
                  onLogin={() => setAuthModal('login')}
                  onRegister={() => setAuthModal('register')}
                />
              )
            )}

            {/* 6. PROFILE TAB */}
            {activeTab === 'profile' && (
              isAuthenticated && user ? (
                <div className="w-full max-w-xl mx-auto space-y-4 animate-fade-in overflow-y-auto flex-1 min-h-0 pb-12 pr-0.5 no-scrollbar">
                  {/* Profile Hero Card */}
                  <div className="p-6 rounded-[28px] glass-card text-center relative overflow-hidden border border-white/10 shadow-xl">
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 py-0.5 px-2.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Live Account</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative w-28 h-28 mx-auto rounded-3xl overflow-hidden border-2 border-rose-500 shadow-xl shadow-rose-500/30 mt-2 mb-3">
                      <img
                        src={
                          user.profile?.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
                        }
                        alt={user.profile?.displayName || user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                      <span>{user.profile?.displayName || user.username}</span>
                      <ShieldCheck className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                    </h2>

                    <p className="text-xs text-slate-400">@{user.username}</p>

                    {user.profile?.locationCity && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{user.profile.locationCity}</span>
                      </div>
                    )}

                    {(user.profile?.companionRateKes || user.profile?.vibeTag) && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
                        {user.profile?.companionRateKes && (
                          <span className="py-1 px-3 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            KES {user.profile.companionRateKes.toLocaleString()}
                          </span>
                        )}
                        {user.profile?.vibeTag && (
                          <span className="py-1 px-3 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                            {user.profile.vibeTag}
                          </span>
                        )}
                      </div>
                    )}

                    {user.profile?.bio && (
                      <p className="text-xs text-slate-300 italic mt-3 px-4 line-clamp-3 leading-relaxed">
                        &ldquo;{user.profile.bio}&rdquo;
                      </p>
                    )}

                    {/* Gallery Photos Preview */}
                    {user.profile?.photos && user.profile.photos.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.08] text-left">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
                          <span className="font-semibold text-white">Gallery Photos ({user.profile.photos.length}/6)</span>
                          <span className="text-[10px] text-rose-400 font-medium">Dating carousel</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {user.profile.photos.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="aspect-square rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 relative group"
                            >
                              <img src={p.photoUrl} alt="Gallery" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              {p.isPrimary && (
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-rose-500/80 text-[9px] font-bold text-white">
                                  Cover
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Edit Profile Action Button */}
                    <div className="mt-4 pt-2">
                      <button
                        onClick={() => setIsEditorOpen(true)}
                        className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4 text-rose-400" />
                        <span>Edit Profile & Photos</span>
                      </button>
                    </div>

                    {/* Profile Completeness Bar */}
                    <div className="mt-4 pt-3 border-t border-white/[0.08] text-left">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>Profile Completeness</span>
                        <span className="font-bold text-rose-400">
                          {user.profile?.profileCompleteness || 60}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-brand rounded-full transition-all duration-500"
                          style={{ width: `${user.profile?.profileCompleteness || 60}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Access Wallet Card */}
                    <button
                      onClick={() => setActiveTab('wallet')}
                      className="w-full mt-4 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl gradient-brand flex items-center justify-center text-white shadow-md">
                          <WalletIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">SociLaLink Wallet</span>
                          <span className="text-[10px] text-slate-400">M-PESA deposits & escrow ledger</span>
                        </div>
                      </div>
                      <span className="text-xs text-rose-400 font-bold">Open →</span>
                    </button>
                  </div>

                  {/* System Verification Badges */}
                  <div className="p-4 rounded-2xl glass-card border border-white/10 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Active Member Capabilities</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Database className="w-3.5 h-3.5" />
                        <span>Verified Profile</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Argon2id Session</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Heart className="w-3.5 h-3.5" />
                        <span>Matching Active</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>M-PESA Escrow Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Admin Moderation Console */}
                  {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                    <button
                      onClick={() => setIsAdminOpen(true)}
                      className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Admin Moderation Console</span>
                    </button>
                  )}

                  {/* Mobile Sign Out Button */}
                  <button
                    onClick={logout}
                    className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 font-bold text-xs transition border border-white/[0.08] hover:border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              ) : (
                <GuestTabCard
                  icon={UserIcon}
                  title="Your Creator & Dating Profile"
                  subtitle="Join SociLaLink to build your dating profile, share moments, and match with verified singles."
                  bullets={[
                    'Strict 18+ verified registration',
                    'Custom photo gallery and relationship intentions',
                    'Location-based discovery with Haversine distance filters',
                  ]}
                  onLogin={() => setAuthModal('login')}
                  onRegister={() => setAuthModal('register')}
                />
              )
            )}
          </main>

          {/* MOBILE FLOATING GLASS BOTTOM NAVIGATION DOCK (< lg only) */}
          <nav className="lg:hidden shrink-0 pt-2 pb-safe px-1 border-t border-white/[0.08] flex items-center justify-around text-slate-400 z-30 bg-[#0C101A]/95 backdrop-blur-2xl">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const label =
                item.id === 'discover'
                  ? 'Discover'
                  : item.id === 'feed'
                  ? 'Feed'
                  : item.id === 'messages'
                  ? 'Chats'
                  : item.id === 'dates'
                  ? 'Dates'
                  : item.id === 'wallet'
                  ? 'Wallet'
                  : 'Profile';

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all cursor-pointer active:scale-95 ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isActive
                          ? 'text-rose-400 fill-rose-500/20 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                          : 'text-slate-400'
                      }`}
                    />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[8px] font-black text-white flex items-center justify-center leading-none shadow-sm shadow-rose-500/50 animate-pulse border border-[#0C101A]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] tracking-tight ${
                      isActive ? 'font-bold text-rose-400' : 'font-medium'
                    }`}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-rose-500 absolute -bottom-0.5 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ======================================================== */}
        {/* 3. DESKTOP AUXILIARY RIGHT PANEL (>= xl screens only)    */}
        {/* Displayed strictly on Discovery tab to keep Dates, Chat, */}
        {/* and Wallet views uncluttered, spacious, and minimalist   */}
        {/* ======================================================== */}
        {activeTab === 'discover' && (
          <aside className="hidden xl:flex w-72 2xl:w-80 shrink-0 h-full flex-col justify-between gap-3 overflow-y-auto no-scrollbar z-20">
            {/* 1. Desktop Keyboard Shortcuts Helper */}
            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400">
                <Zap className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Quick Discovery</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scroll Feed</span>
                  <span className="kbd-badge">↓ / ↑</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tap to Text</span>
                  <span className="kbd-badge">1-Click DM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Double Click Photo</span>
                  <span className="kbd-badge flex items-center gap-1">
                    Spark <Heart className="w-3 h-3 text-rose-400 fill-rose-500 inline" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Flip Photos</span>
                  <span className="kbd-badge">Tap Left/Right</span>
                </div>
              </div>
            </div>

            {/* 2. Nairobi Dating & Companion Hotspots */}
            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400">
                <MapPin className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Nairobi Active Areas</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Westlands & Sarit</span>
                    <span className="text-[10px] text-slate-400">Cocktail lounges & dinner dates</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">High Match</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Kilimani & Yaya</span>
                    <span className="text-[10px] text-slate-400">Art galleries & coffee meetups</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-400">Trending</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Karen & Hub</span>
                    <span className="text-[10px] text-slate-400">Exclusive companion dates</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400">VIP</span>
                </div>
              </div>
            </div>

            {/* 3. Escrow Financial Security Guarantee */}
            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Safe Escrow Protocol</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Companion dates on SociLaLink are protected by double-entry escrow. Funds are never released until the in-person meeting is verified with the 6-digit PIN.
              </p>
            </div>
          </aside>
        )}

        {/* ======================================================== */}
        {/* MODALS & OVERLAYS                                        */}
        {/* ======================================================== */}

        {/* Companion Date Direct Booking & Escrow Modal */}
        <CreateDateInviteModal
          isOpen={isDateInviteModalOpen}
          partner={dateModalPartner}
          onClose={() => {
            setIsDateInviteModalOpen(false);
            setDateModalPartner(null);
          }}
          onSuccess={() => {
            setIsDateInviteModalOpen(false);
            setDateModalPartner(null);
            setActiveTab('dates');
          }}
        />

        {/* Profile Editor Modal */}
        <ProfileEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
        />

        {/* Mutual Match Modal */}
        <MatchModal
          isOpen={!!activeMatch}
          matchData={activeMatch}
          onClose={() => setActiveMatch(null)}
          onStartConversation={(partnerId) => {
            const targetId = partnerId || activeMatch?.partner?.userId;
            setActiveMatch(null);
            if (targetId) setSelectedChatPartnerId(targetId);
            setActiveTab('messages');
          }}
        />

        {/* Public Creator & Candidate Profile Modal */}
        <UserProfileModal
          isOpen={!!viewingProfileUserId}
          userId={viewingProfileUserId}
          onClose={() => setViewingProfileUserId(null)}
          onStartChat={(targetUserId) => {
            setViewingProfileUserId(null);
            setSelectedChatPartnerId(targetUserId);
            setActiveTab('messages');
          }}
          onBookDate={(candidateData) => {
            setViewingProfileUserId(null);
            setDateModalPartner(candidateData);
            setIsDateInviteModalOpen(true);
          }}
          onRequestAuth={() => {
            setViewingProfileUserId(null);
            setAuthModal('login');
          }}
        />

        {/* Admin Moderation Console */}
        <AdminDashboardModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />

        {/* Mandatory Age Verification & Profile Onboarding Modal for Google / Unconfirmed Users */}
        {isAuthenticated && user?.profile && user.profile.dobConfirmed === false && (
          <AgeVerificationModal
            onSuccess={() => refreshUser()}
            confirmAge={confirmAge}
          />
        )}

        {/* Authentication Dialog Modal */}
        {authModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAuthModal(null);
            }}
          >
            <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-[32px] shadow-2xl glass-panel border border-white/10">
              {authModal === 'login' && (
                <LoginModal
                  onBack={() => setAuthModal(null)}
                  onSignUpClick={() => setAuthModal('register')}
                  onSuccess={() => {
                    refreshUser();
                    setAuthModal(null);
                  }}
                />
              )}

              {authModal === 'register' && (
                <RegisterWizard
                  onBack={() => setAuthModal(null)}
                  onLoginClick={() => setAuthModal('login')}
                  onSuccess={() => {
                    refreshUser();
                    setAuthModal(null);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
