'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Sparkles,
  Heart,
  MessageCircle,
  Wine,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Flame,
  Calendar,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface UserProfilePhoto {
  id: string;
  photoUrl: string;
  isPrimary: boolean;
  orderIndex: number;
}

export interface UserProfilePost {
  id: string;
  caption?: string | null;
  locationName?: string | null;
  priceKes?: number | null;
  isLocked?: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  mediaUrl?: string | null;
  mediaType?: string;
}

export interface UserPublicProfile {
  userId: string;
  username: string;
  displayName: string;
  age: number;
  gender: string;
  bio?: string | null;
  avatarUrl?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  isVerified: boolean;
  profileCompleteness: number;
  companionRateKes?: number | null;
  vibeTag?: string | null;
  favoriteSpot?: string | null;
  photos: UserProfilePhoto[];
  stats: {
    followersCount: number;
    followingCount: number;
    postsCount: number;
  };
  isFollowing?: boolean;
  isSelf?: boolean;
  recentPosts?: UserProfilePost[];
}

interface UserProfileModalProps {
  isOpen: boolean;
  userId: string | null;
  initialData?: Partial<UserPublicProfile> | null;
  onClose: () => void;
  onStartChat?: (userId: string, displayName: string) => void;
  onBookDate?: (userData: any) => void;
  onRequestAuth?: () => void;
}

export function UserProfileModal({
  isOpen,
  userId,
  initialData,
  onClose,
  onStartChat,
  onBookDate,
  onRequestAuth,
}: UserProfileModalProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync shortlist status from local storage
  useEffect(() => {
    if (profile?.userId && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('socilalink_shortlist_ids');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) setIsBookmarked(list.includes(profile.userId));
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [profile?.userId]);

  const handleToggleBookmark = () => {
    if (!profile?.userId) return;
    const next = !isBookmarked;
    setIsBookmarked(next);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('socilalink_shortlist_ids');
        let list: string[] = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];
        if (next) {
          if (!list.includes(profile.userId)) list.push(profile.userId);
          showToast('Saved to your private shortlist!');
        } else {
          list = list.filter((id) => id !== profile.userId);
          showToast('Removed from shortlist');
        }
        localStorage.setItem('socilalink_shortlist_ids', JSON.stringify(list));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProfile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/profiles/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load profile');
      }
      const data: UserPublicProfile = json.data;
      setProfile(data);
      setIsFollowing(Boolean(data.isFollowing));
      setFollowersCount(data.stats?.followersCount || 0);
    } catch (err: any) {
      console.error('Error fetching public profile:', err);
      setError(err.message || 'Could not load user profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      // Set initial fallback data if provided
      if (initialData) {
        setProfile((prev) => ({
          ...(prev || {}),
          userId,
          username: initialData.username || 'user',
          displayName: initialData.displayName || 'Creator',
          age: initialData.age || 24,
          gender: initialData.gender || 'OTHER',
          avatarUrl: initialData.avatarUrl || null,
          locationCity: initialData.locationCity || null,
          isVerified: Boolean(initialData.isVerified),
          companionRateKes: initialData.companionRateKes ?? null,
          vibeTag: initialData.vibeTag ?? null,
          photos: initialData.photos || [],
          stats: { followersCount: 0, followingCount: 0, postsCount: 0 },
          ...initialData,
        } as UserPublicProfile));
      }
      fetchProfile(userId);
    } else {
      setProfile(null);
      setLightboxIndex(null);
      setError(null);
    }
  }, [isOpen, userId, initialData, fetchProfile]);

  // Handle keyboard events for full-screen photo lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!profile || profile.photos.length === 0) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => ((prev ?? 0) + 1) % profile.photos.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => ((prev ?? 0) - 1 + profile.photos.length) % profile.photos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, profile]);

  if (!isOpen) return null;

  const handleToggleFollow = async () => {
    if (!currentUser) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please log in to follow creators');
      return;
    }
    if (!profile) return;

    const previousFollowState = isFollowing;
    const nextState = !previousFollowState;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await fetch(`/api/v1/profiles/${profile.userId}/follow`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to update follow status');
      showToast(nextState ? `Following @${profile.username}` : `Unfollowed @${profile.username}`);
    } catch {
      setIsFollowing(previousFollowState);
      setFollowersCount((prev) => (previousFollowState ? prev + 1 : Math.max(0, prev - 1)));
      showToast('Could not update follow status');
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please log in to send a spark');
      return;
    }
    if (!profile) return;

    const nextState = !isLiked;
    setIsLiked(nextState);

    try {
      await fetch('/api/v1/discover/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: profile.userId }),
      });
      if (nextState) {
        showToast(`Sent a spark to ${profile.displayName}!`);
      }
    } catch {
      // Revert quietly on error
      setIsLiked(!nextState);
    }
  };

  const handleStartChat = () => {
    if (!currentUser) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please sign in to message creators');
      return;
    }
    if (profile && onStartChat) {
      onClose();
      onStartChat(profile.userId, profile.displayName);
    }
  };

  const handleBookDate = () => {
    if (!currentUser) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please sign in to book companion dates');
      return;
    }
    if (profile && onBookDate) {
      onClose();
      onBookDate(profile);
    }
  };

  // Compile all photos including avatar fallback if gallery has none
  const galleryPhotos = profile?.photos || [];
  const primaryPhoto =
    galleryPhotos.find((p) => p.isPrimary)?.photoUrl ||
    galleryPhotos[0]?.photoUrl ||
    profile?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div
          className="relative w-full max-w-lg my-4 bg-[#0d111a] rounded-[32px] border border-white/10 shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-4 inset-x-6 z-50 flex justify-center pointer-events-none animate-bounce">
              <div className="py-2 px-4 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-xs font-bold shadow-xl border border-rose-400/30">
                {toastMessage}
              </div>
            </div>
          )}

          {/* Top Sticky Header */}
          <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
            <div className="py-1 px-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white/90">
              {profile ? `@${profile.username}` : 'Creator Profile'}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white/80 hover:text-white border border-white/10 transition cursor-pointer pointer-events-auto"
              title="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {/* 1. Hero Cover & Profile Identity (Full-bleed edge-to-edge with top framing) */}
            <div className="relative w-full aspect-[4/3] bg-slate-900 overflow-hidden">
              <img
                src={primaryPhoto}
                alt={profile?.displayName || 'Cover'}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d111a] via-[#0d111a]/30 to-transparent" />

              {/* Bottom Hero Overlay */}
              <div className="absolute bottom-4 inset-x-5 flex items-end justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-rose-500 shadow-xl shrink-0">
                    <img
                      src={profile?.avatarUrl || primaryPhoto}
                      alt={profile?.displayName || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {profile?.displayName || 'Loading...'}, {profile?.age || 24}
                      </h2>
                      {profile?.isVerified && (
                        <div title="Verified Profile">
                          <ShieldCheck className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                      {profile?.locationCity && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{profile.locationCity}</span>
                        </span>
                      )}
                      {profile?.distanceKm !== undefined && profile.distanceKm !== null && (
                        <span className="text-slate-400">• {profile.distanceKm} km away</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Follow Button */}
                {!profile?.isSelf && (
                  <button
                    onClick={handleToggleFollow}
                    className={`py-1.5 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 ${
                      isFollowing
                        ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                        : 'gradient-brand text-white hover:brightness-110 shadow-rose-500/20'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 2. Profile Details & Stats */}
            <div className="p-5 space-y-5">
              {/* Vibe, Escrow Rate & Hangout Spots */}
              <div className="flex flex-wrap items-center gap-2">
                {profile?.companionRateKes ? (
                  <button
                    onClick={handleBookDate}
                    className="py-1 px-3 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rendezvous Rate: KES {profile.companionRateKes.toLocaleString()}</span>
                  </button>
                ) : (
                  <span className="py-1 px-3 rounded-full bg-white/[0.06] border border-white/10 text-slate-300 text-xs font-medium">
                    Open to Companion Offers
                  </span>
                )}

                {profile?.vibeTag && (
                  <span className="py-1 px-3 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
                    {profile.vibeTag}
                  </span>
                )}

                {profile?.favoriteSpot && (
                  <span className="py-1 px-3 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-1">
                    <Wine className="w-3 h-3 text-purple-400" />
                    <span>Hangout: {profile.favoriteSpot}</span>
                  </span>
                )}
              </div>

              {/* Bio Statement */}
              {profile?.bio ? (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/05 text-sm text-slate-200 leading-relaxed italic">
                  &ldquo;{profile.bio}&rdquo;
                </div>
              ) : null}

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-2xl bg-white/[0.02] border border-white/05 text-center">
                <div>
                  <div className="text-base font-extrabold text-white">{followersCount}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Followers</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">
                    {profile?.stats?.followingCount || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Following</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">
                    {profile?.stats?.postsCount || profile?.recentPosts?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Moments</div>
                </div>
              </div>

              {/* 3. THE CORE GALLERY SECTION: Up to 6 Photos Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-extrabold text-white tracking-wide">
                      Gallery Photos{' '}
                      <span className="text-xs text-rose-400 font-semibold">
                        ({galleryPhotos.length}/6)
                      </span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Tap to expand</span>
                </div>

                {galleryPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {galleryPhotos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        onClick={() => setLightboxIndex(idx)}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 hover:border-rose-500/50 transition cursor-pointer shadow-md"
                      >
                        <img
                          src={photo.photoUrl}
                          alt={`Gallery photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                        {photo.isPrimary && (
                          <span className="absolute bottom-1.5 left-1.5 py-0.5 px-1.5 rounded-md bg-rose-500/90 text-[9px] font-black text-white shadow-sm">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-slate-400">
                    No extra gallery photos uploaded yet.
                  </div>
                )}
              </div>

              {/* 4. Recent Moments / Posts Section */}
              {profile?.recentPosts && profile.recentPosts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-extrabold text-white tracking-wide">Recent Moments</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {profile.recentPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-2 rounded-2xl bg-white/[0.03] border border-white/05 space-y-1.5 text-xs"
                      >
                        {post.mediaUrl && (
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/50">
                            <img
                              src={post.mediaUrl}
                              alt={post.caption || 'Post'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {post.caption && (
                          <p className="text-[11px] text-slate-300 line-clamp-2">{post.caption}</p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400 fill-rose-500 shrink-0" />
                            <span>{post.likesCount}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{post.commentsCount}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Sticky Direct Action Footer */}
          {!profile?.isSelf && (
            <div className="p-4 border-t border-white/10 bg-[#0d111a]/95 backdrop-blur-md flex items-center justify-between gap-2.5">
              {/* Send Spark / Like */}
              <button
                onClick={handleToggleLike}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  isLiked
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-white/[0.06] hover:bg-rose-500/15 border-white/10 text-slate-300 hover:text-rose-400'
                }`}
                title="Send Spark"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>

              {/* Bookmark / Shortlist */}
              <button
                onClick={handleToggleBookmark}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-white/[0.06] hover:bg-amber-500/15 border-white/10 text-slate-300 hover:text-amber-400'
                }`}
                title="Save to Shortlist"
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>

              {/* Text User Button */}
              <button
                onClick={handleStartChat}
                className="flex-1 py-3 px-4 rounded-2xl gradient-brand text-white text-xs font-black transition shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white/20" />
                <span>Text {profile ? profile.displayName.split(' ')[0] : 'User'}</span>
              </button>

              {/* Companion Date Booking Button */}
              <button
                onClick={handleBookDate}
                className="py-3 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-200 border border-amber-500/30 text-xs font-extrabold transition shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Book date & fund escrow"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Meet Up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULL-SCREEN INTERACTIVE PHOTO LIGHTBOX */}
      {lightboxIndex !== null && galleryPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Lightbox Controls */}
          <div
            className="absolute top-5 inset-x-5 flex items-center justify-between text-white z-20 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1 px-3 rounded-full bg-white/10 backdrop-blur-md text-xs font-mono">
              Photo {lightboxIndex + 1} of {galleryPhotos.length}
            </div>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer pointer-events-auto"
              title="Close Fullscreen (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Large Image View */}
          <div
            className="relative max-w-3xl max-h-[82vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryPhotos[lightboxIndex].photoUrl}
              alt={`Full view ${lightboxIndex + 1}`}
              className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>

          {/* Left / Right Navigation Controls */}
          {galleryPhotos.length > 1 && (
            <div
              className="absolute inset-y-0 inset-x-3 sm:inset-x-6 flex items-center justify-between pointer-events-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() =>
                  setLightboxIndex(
                    (prev) => ((prev ?? 0) - 1 + galleryPhotos.length) % galleryPhotos.length
                  )
                }
                className="p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition cursor-pointer pointer-events-auto shadow-xl"
                title="Previous photo (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() =>
                  setLightboxIndex((prev) => ((prev ?? 0) + 1) % galleryPhotos.length)
                }
                className="p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition cursor-pointer pointer-events-auto shadow-xl"
                title="Next photo (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
