'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CreatePostModal } from './CreatePostModal';
import { CommentsDrawer } from './CommentsDrawer';
import { CommunityNoteBanner, CommunityNoteData } from '../ui/CommunityNoteBanner';
import { SuggestCommunityNoteModal } from '../safety/SuggestCommunityNoteModal';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MapPin,
  ShieldCheck,
  Sparkles,
  MoreHorizontal,
  ShieldAlert,
  Lock,
  Unlock,
  Wallet,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  X,
  Search,
  Clock,
  Flame,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { formatDuration, formatRemainingTime } from '@/utils/duration';

interface FeedPost {
  id: string;
  caption?: string | null;
  locationName?: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  isLocked?: boolean;
  priceKes?: number;
  hasUnlocked?: boolean;
  isViewOnce?: boolean;
  durationSeconds?: number;
  hasBurned?: boolean;
  viewStatus?: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  media: {
    id: string;
    mediaUrl: string;
    mediaType: string;
    orderIndex: number;
  }[];
  communityNote?: CommunityNoteData | null;
}

interface FeedScreenProps {
  onRequestAuth?: () => void;
  onOpenProfile?: (userId: string) => void;
}

const PREVIEW_POSTS: FeedPost[] = [
  {
    id: 'post-prev-1',
    caption: 'Golden hour in Nairobi. Excited for the upcoming runway drop! Who else is attending the showcase this weekend?',
    locationName: 'Westlands, Nairobi',
    likesCount: 342,
    commentsCount: 28,
    hasLiked: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    author: {
      id: 'prev-1',
      username: 'aisha_m',
      displayName: 'Aisha Al-Mansoor',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
      isVerified: true,
    },
    media: [
      {
        id: 'm1',
        mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900',
        mediaType: 'IMAGE',
        orderIndex: 0,
      },
    ],
  },
  {
    id: 'post-prev-2',
    caption: 'Weekend hike conquered! Nothing beats the panoramic views of the Rift Valley. Remember to take time to recharge.',
    locationName: 'Ngong Hills, Kenya',
    likesCount: 189,
    commentsCount: 14,
    hasLiked: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    author: {
      id: 'prev-2',
      username: 'chloe_w',
      displayName: 'Chloe Wanjiru',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500',
      isVerified: true,
    },
    media: [
      {
        id: 'm2',
        mediaUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
        mediaType: 'IMAGE',
        orderIndex: 0,
      },
    ],
    communityNote: {
      id: 'cn-post-prev-1',
      category: 'STOLEN_MEDIA',
      content: 'Readers added context: The trail photograph in this post was taken during a guided eco-expedition organized by Great Rift Treks and originally published in Kenya Outdoors (2023). Context added for creator attribution.',
      helpfulCount: 54,
      notHelpfulCount: 3,
      userRating: null,
    },
  },
];

export function FeedScreen({ onRequestAuth, onOpenProfile }: FeedScreenProps) {
  const { user, refreshUser, unreadMessagesCount } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination & Infinite Scroll State
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Modals & Drawers
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [commentsDrawerPostId, setCommentsDrawerPostId] = useState<string | null>(null);
  const [suggestNoteTarget, setSuggestNoteTarget] = useState<{
    isOpen: boolean;
    postId: string;
    authorName: string;
  }>({
    isOpen: false,
    postId: '',
    authorName: '',
  });

  // Interaction Sets
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-hide top search & upload bar on scroll down, reveal on scroll up
  const [isFeedHeaderVisible, setIsFeedHeaderVisible] = useState(true);
  const lastFeedScrollRef = useRef(0);

  const handleFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScroll = e.currentTarget.scrollTop;
    const lastScroll = lastFeedScrollRef.current;
    const delta = currentScroll - lastScroll;

    // Do not hide header if user is currently searching/typing
    if (document.activeElement?.tagName === 'INPUT') return;

    if (currentScroll <= 15) {
      setIsFeedHeaderVisible(true);
      lastFeedScrollRef.current = currentScroll;
      return;
    }

    // Guard against iOS elastic bounce at bottom
    if (currentScroll + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 5) {
      return;
    }

    if (Math.abs(delta) > 8) {
      if (delta > 0 && currentScroll > 50) {
        setIsFeedHeaderVisible(false);
      } else if (delta < 0) {
        setIsFeedHeaderVisible(true);
      }
      lastFeedScrollRef.current = currentScroll;
    }
  };

  // Monetization & Moment Unlock State
  const [unlockingPost, setUnlockingPost] = useState<FeedPost | null>(null);
  const [unlockedPostIds, setUnlockedPostIds] = useState<Set<string>>(new Set());
  const [unlockMethod, setUnlockMethod] = useState<'WALLET' | 'MPESA'>('WALLET');
  const [unlockPhone, setUnlockPhone] = useState(user?.phone || '');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [mpesaWaiting, setMpesaWaiting] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Timed Media / View Once State
  const [viewingTimedPost, setViewingTimedPost] = useState<FeedPost | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(10);
  const [remainingTimeByPostId, setRemainingTimeByPostId] = useState<Record<string, number>>({});
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [burnedPostIds, setBurnedPostIds] = useState<Set<string>>(new Set());

  const handleBurnPost = async (post: FeedPost) => {
    // Only burn free ephemeral posts, never paid locked moments
    if (post.isLocked) return;
    setBurnedPostIds((prev) => new Set(prev).add(post.id));
    setRemainingTimeByPostId((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });
    setViewingTimedPost(null);
    setIsBlackedOut(false);
    setIsHolding(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      await fetch(`/api/v1/posts/${post.id}/burn`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      showToast('Moment viewing time expired');
    } catch (err) {
      console.error('Failed to record burned moment:', err);
    }
  };

  // Countdown timer for viewing timed post
  useEffect(() => {
    if (!viewingTimedPost) return;
    const isMine = viewingTimedPost.author.id === user?.id;
    if (isMine) return;

    // Use saved remaining time if user already started viewing, otherwise full duration
    const totalSec =
      remainingTimeByPostId[viewingTimedPost.id] ??
      (viewingTimedPost.durationSeconds || 10);
    setRemainingTime(totalSec);
    setIsBlackedOut(false);
    setIsHolding(true);

    // Paid locked posts never burn on timer
    if (viewingTimedPost.isLocked) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleBurnPost(viewingTimedPost);
          return 0;
        }
        const updated = prev - 1;
        setRemainingTimeByPostId((rMap) => ({ ...rMap, [viewingTimedPost.id]: updated }));
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [viewingTimedPost]);

  const handleReplayFreePost = (post: FeedPost) => {
    setBurnedPostIds((prev) => {
      const next = new Set(prev);
      next.delete(post.id);
      return next;
    });
    const duration = post.durationSeconds || 10;
    setRemainingTimeByPostId((prev) => ({
      ...prev,
      [post.id]: duration,
    }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, hasBurned: false, viewStatus: 'PENDING' } : p
      )
    );
    setViewingTimedPost(post);
  };

  // Anti-Screenshot Defense
  useEffect(() => {
    if (!viewingTimedPost) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        setIsBlackedOut(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [viewingTimedPost]);

  const handleOpenUnlockModal = (post: FeedPost) => {
    if (!user) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please sign in to unlock exclusive moments');
      return;
    }
    setUnlockingPost(post);
    setUnlockPhone(user.phone || '');
    setUnlockError(null);
    setMpesaWaiting(false);
    setIsUnlocking(false);
    const balance = user.wallet?.balanceKes ?? 0;
    setUnlockMethod(balance >= (post.priceKes || 50) ? 'WALLET' : 'MPESA');
  };

  const handleWalletUnlock = async (post: FeedPost) => {
    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`/api/v1/posts/${post.id}/unlock-wallet`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === 'INSUFFICIENT_FUNDS') {
          setUnlockMethod('MPESA');
          setUnlockError('Insufficient wallet balance. Pay directly via Safaricom M-PESA below:');
          return;
        }
        throw new Error(data.error || 'Failed to unlock moment');
      }

      setUnlockedPostIds((prev) => new Set(prev).add(post.id));
      setBurnedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
      setRemainingTimeByPostId((prev) => ({
        ...prev,
        [post.id]: post.durationSeconds || 300,
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, hasUnlocked: true, hasBurned: false, viewStatus: 'PENDING' }
            : p
        )
      );
      if (refreshUser) refreshUser();
      setUnlockingPost(null);
      showToast('Moment unlocked successfully!');
    } catch (err: any) {
      setUnlockError(err.message || 'Payment error');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleMpesaUnlock = async (post: FeedPost) => {
    if (!unlockPhone.trim()) {
      setUnlockError('Please enter your Safaricom M-PESA phone number');
      return;
    }
    setIsUnlocking(true);
    setUnlockError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`/api/v1/posts/${post.id}/unlock-mpesa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: unlockPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch M-PESA prompt');
      }

      setMpesaWaiting(true);
      const checkoutRequestId = data.data?.checkoutRequestId;

      // Start status polling
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(pollInterval);
          setIsUnlocking(false);
          setMpesaWaiting(false);
          setUnlockError('M-PESA prompt timed out. If you paid, refresh in a moment.');
          return;
        }

        try {
          const statusRes = await fetch(
            `/api/v1/posts/${post.id}/mpesa-status${checkoutRequestId ? `?checkoutRequestId=${checkoutRequestId}` : ''}`
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.isUnlocked || statusData.status === 'COMPLETED') {
              clearInterval(pollInterval);
              setUnlockedPostIds((prev) => new Set(prev).add(post.id));
              setBurnedPostIds((prev) => {
                const next = new Set(prev);
                next.delete(post.id);
                return next;
              });
              setRemainingTimeByPostId((prev) => ({
                ...prev,
                [post.id]: post.durationSeconds || 300,
              }));
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === post.id
                    ? { ...p, hasUnlocked: true, hasBurned: false, viewStatus: 'PENDING' }
                    : p
                )
              );
              if (refreshUser) refreshUser();
              setUnlockingPost(null);
              setIsUnlocking(false);
              setMpesaWaiting(false);
              showToast('M-PESA payment confirmed! Moment unlocked!');
              return;
            } else if (statusData.status === 'CANCELLED') {
              clearInterval(pollInterval);
              setIsUnlocking(false);
              setMpesaWaiting(false);
              setUnlockError('M-PESA prompt was cancelled on phone.');
              return;
            } else if (statusData.status === 'FAILED') {
              clearInterval(pollInterval);
              setIsUnlocking(false);
              setMpesaWaiting(false);
              setUnlockError(statusData.message || 'M-PESA transaction failed');
              return;
            }
          }
        } catch {}
      }, 2000);
    } catch (err: any) {
      setIsUnlocking(false);
      setMpesaWaiting(false);
      setUnlockError(err.message || 'Failed to send prompt');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPosts = async (isLoadMore: boolean = false) => {
    if (isLoadMore) {
      if (!nextCursor || loadingMore || !hasMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const url =
        isLoadMore && nextCursor
          ? `/api/v1/posts/feed?limit=10&cursor=${nextCursor}`
          : `/api/v1/posts/feed?limit=10`;

      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts)) {
          if (isLoadMore) {
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const freshPosts = data.posts.filter((p: FeedPost) => !existingIds.has(p.id));
              return [...prev, ...freshPosts];
            });
          } else {
            setPosts(data.posts.length > 0 ? data.posts : PREVIEW_POSTS);
          }
          setNextCursor(data.nextCursor || null);
          setHasMore(Boolean(data.nextCursor));
          return;
        }
      }
      if (!isLoadMore) {
        setPosts(PREVIEW_POSTS);
        setHasMore(false);
      }
    } catch {
      if (!isLoadMore) {
        setPosts(PREVIEW_POSTS);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(false);
  }, [user]);

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    if (!hasMore || loadingMore || loading || searchQuery.trim()) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(true);
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextCursor, searchQuery]);

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const usernameMatch = post.author?.username?.toLowerCase().includes(q);
    const displayNameMatch = post.author?.displayName?.toLowerCase().includes(q);
    const captionMatch = post.caption?.toLowerCase().includes(q);
    const locationMatch = post.locationName?.toLowerCase().includes(q);
    return Boolean(usernameMatch || displayNameMatch || captionMatch || locationMatch);
  });

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please log in or sign up to like moments');
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked: newLiked,
            likesCount: newLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/v1/posts/${postId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, hasLiked: data.liked, likesCount: data.likesCount }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleToggleFollow = async (authorId: string) => {
    if (!user) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please log in to follow creators');
      return;
    }

    const isCurrentlyFollowing = followingAuthorIds.has(authorId);
    setFollowingAuthorIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) next.delete(authorId);
      else next.add(authorId);
      return next;
    });

    try {
      const res = await fetch(`/api/v1/profiles/${authorId}/follow`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.following ? 'Followed creator!' : 'Unfollowed creator');
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  const handleShare = (postId: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
      showToast('Post link copied to clipboard!');
    } else {
      showToast('Moment link ready to share!');
    }
  };

  const handleToggleSave = (postId: string) => {
    if (!user) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Please log in to bookmark moments');
      return;
    }

    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        showToast('Post removed from bookmarks');
      } else {
        next.add(postId);
        showToast('Moment saved to bookmarks!');
      }
      return next;
    });
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col h-full w-full select-none overflow-hidden">
      {/* Header: Creator Search & Upload Moment */}
      <div
        className={`flex items-center gap-2 px-1 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isFeedHeaderVisible
            ? 'max-h-16 opacity-100 py-1.5 mb-2'
            : 'max-h-0 opacity-0 py-0 mb-0 pointer-events-none'
        }`}
      >
        {/* Search Bar */}
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators..."
            className="w-full h-9 sm:h-10 pl-8 sm:pl-9 pr-7 sm:pr-8 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] text-xs text-white placeholder-slate-400 rounded-2xl border border-white/[0.08] focus:border-rose-500/50 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Upload Moment Button */}
        <button
          onClick={() => {
            if (!user) {
              if (onRequestAuth) onRequestAuth();
              else showToast('Please log in or create an account to post');
              return;
            }
            setIsCreatePostOpen(true);
          }}
          className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-2xl gradient-brand text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/25 hover:opacity-95 active:scale-95 transition shrink-0 cursor-pointer"
          title="Upload Moment"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden xs:inline">Upload</span>
        </button>

        {/* Notifications Button */}
        <button
          onClick={() =>
            showToast(
              unreadMessagesCount > 0
                ? `You have ${unreadMessagesCount} unread message(s) in Conversations!`
                : 'All notifications and messages are up to date!'
            )
          }
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition border border-white/[0.08] shrink-0 cursor-pointer active:scale-95"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-40 p-3 rounded-2xl glass-panel text-xs text-white text-center shadow-xl animate-fade-in flex items-center justify-center gap-2 border border-rose-500/30">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Feed Stream */}
      <div
        onScroll={handleFeedScroll}
        className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1 pb-4 no-scrollbar"
      >
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="w-full rounded-[28px] glass-card border border-white/10 p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-28 h-3.5 bg-white/10 rounded-md" />
                    <div className="w-16 h-2.5 bg-white/10 rounded-md" />
                  </div>
                </div>
                <div className="w-full h-64 bg-white/10 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          searchQuery.trim() ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">No moments found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No creators or moments matched &ldquo;{searchQuery}&rdquo;. Try another name or @username.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-medium text-slate-300 transition cursor-pointer"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">No moments uploaded yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Be the first to share an exclusive photo or video moment!
              </p>
              <button
                onClick={() => {
                  if (!user) {
                    if (onRequestAuth) onRequestAuth();
                    else showToast('Please log in or create an account to post');
                    return;
                  }
                  setIsCreatePostOpen(true);
                }}
                className="px-4 py-2 rounded-xl gradient-brand text-xs font-bold text-white shadow-md shadow-rose-500/25 transition cursor-pointer"
              >
                Upload First Moment
              </button>
            </div>
          )
        ) : (
          filteredPosts.map((post) => {
            const isSaved = savedPostIds.has(post.id);
            const isFollowing = followingAuthorIds.has(post.author.id);
            const isAuthorMe = post.author.id === user?.id;

            return (
              <article
                key={post.id}
                className="w-full rounded-[28px] glass-card border border-white/10 overflow-hidden shadow-xl"
              >
                {/* Header */}
                <div className="p-3.5 flex items-center justify-between">
                  <div
                    onClick={() => onOpenProfile && onOpenProfile(post.author.id)}
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition group"
                    title={`View @${post.author.username}'s profile & photos`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-rose-500/40 group-hover:border-rose-400 transition">
                      <img
                        src={post.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={post.author.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-rose-300 transition">
                          {post.author.displayName}
                        </span>
                        {post.author.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                        )}
                      </div>
                      {post.locationName && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{post.locationName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isAuthorMe && (
                    <button
                      onClick={() => handleToggleFollow(post.author.id)}
                      className={`py-1 px-3 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        isFollowing
                          ? 'bg-white/[0.08] text-slate-300 border border-white/10'
                          : 'gradient-brand text-white shadow-sm shadow-rose-500/30'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>

                {/* Media */}
                {post.media.length > 0 && (() => {
                  const hasActiveUnlock = isAuthorMe || post.hasUnlocked || unlockedPostIds.has(post.id);
                  const isUnlockedMoment = post.isLocked && hasActiveUnlock;
                  // Only free view-once posts can be burned. Paid locked posts never burn once unlocked.
                  const isBurnedForMe = !isAuthorMe && !post.isLocked && (post.hasBurned || burnedPostIds.has(post.id) || post.viewStatus === 'BURNED');
                  const isFreeTimedMedia = !post.isLocked && Boolean(post.isViewOnce || (post.durationSeconds && post.durationSeconds > 0));
                  // Post is locked if it's locked and user has NOT unlocked it
                  const isLockedMoment = post.isLocked && !isAuthorMe && !hasActiveUnlock;

                  return (
                    <div
                      onDoubleClick={() => !isLockedMoment && !isBurnedForMe && handleToggleLike(post.id)}
                      className="relative w-full aspect-square bg-black overflow-hidden"
                    >
                      {/* State 1: Locked Moment - Blurred with Centered Unlock Button Only */}
                      {isLockedMoment ? (
                        <>
                          {/* Blurred Media */}
                          {post.media[0].mediaType === 'VIDEO' ? (
                            <video
                              src={post.media[0].mediaUrl}
                              className="w-full h-full object-cover filter blur-2xl scale-110 pointer-events-none select-none"
                              style={{ filter: 'blur(32px)', WebkitFilter: 'blur(32px)' }}
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={post.media[0].mediaUrl}
                              alt="Locked moment preview"
                              className="w-full h-full object-cover filter blur-2xl scale-110 pointer-events-none select-none transition-all duration-700"
                              style={{ filter: 'blur(32px)', WebkitFilter: 'blur(32px)' }}
                            />
                          )}

                          {/* Minimal Overlay with Unlock Button Only */}
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center p-4 select-none">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenUnlockModal(post);
                              }}
                              className="py-3 px-6 rounded-full gradient-brand text-xs font-black text-white shadow-2xl shadow-rose-500/50 hover:shadow-rose-500/70 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/20 backdrop-blur-md"
                            >
                              <Lock className="w-4 h-4" />
                              <span>Unlock for KES {post.priceKes || 50}</span>
                            </button>
                          </div>
                        </>
                      ) : isBurnedForMe ? (
                        /* State 2: Free Timed Moment Burned - Clean Blurred Preview with Watch Again */
                        <>
                          {post.media[0].mediaType === 'VIDEO' ? (
                            <video
                              src={post.media[0].mediaUrl}
                              className="w-full h-full object-cover filter blur-2xl scale-110 pointer-events-none select-none"
                              style={{ filter: 'blur(32px)', WebkitFilter: 'blur(32px)' }}
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={post.media[0].mediaUrl}
                              alt="Burned moment preview"
                              className="w-full h-full object-cover filter blur-2xl scale-110 pointer-events-none select-none"
                              style={{ filter: 'blur(32px)', WebkitFilter: 'blur(32px)' }}
                            />
                          )}

                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center p-4 select-none">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplayFreePost(post);
                              }}
                              className="py-3 px-6 rounded-full bg-white/[0.12] hover:bg-white/[0.2] border border-white/20 text-xs font-black text-white shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Watch Again</span>
                            </button>
                          </div>
                        </>
                      ) : isFreeTimedMedia && !isAuthorMe ? (
                        /* State 3: Free Timed Moment - Minimal Tap to View */
                        (() => {
                          const activeLeftSec = remainingTimeByPostId[post.id];
                          const hasStarted = activeLeftSec !== undefined && activeLeftSec < (post.durationSeconds || 10);
                          const displaySec = hasStarted ? activeLeftSec : (post.durationSeconds || 300);

                          return (
                            <div
                              onClick={() => setViewingTimedPost(post)}
                              className="relative w-full h-full cursor-pointer group"
                            >
                              {post.media[0].mediaType === 'VIDEO' ? (
                                <video
                                  src={post.media[0].mediaUrl}
                                  className="w-full h-full object-cover filter blur-xl scale-110 pointer-events-none select-none"
                                  style={{ filter: 'blur(20px)', WebkitFilter: 'blur(20px)' }}
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={post.media[0].mediaUrl}
                                  alt="Timed media preview"
                                  className="w-full h-full object-cover filter blur-xl scale-110 pointer-events-none select-none"
                                  style={{ filter: 'blur(20px)', WebkitFilter: 'blur(20px)' }}
                                />
                              )}
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center p-4 select-none">
                                <button
                                  type="button"
                                  className="py-3 px-6 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-2xl transition flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                                >
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {hasStarted
                                      ? `Resume (${formatRemainingTime(displaySec)} left)`
                                      : `View (${formatDuration(displaySec)})`}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* State 4: Standard Media / Unlocked Preview (Edge-to-edge full bleed with top framing) */
                        <div
                          className="relative w-full h-full cursor-pointer group bg-black overflow-hidden"
                          onClick={() => setViewingTimedPost(post)}
                        >
                          {post.media[0].mediaType === 'VIDEO' ? (
                            <video
                              src={post.media[0].mediaUrl}
                              controls
                              playsInline
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <img
                              src={post.media[0].mediaUrl}
                              alt="Post media"
                              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                          )}

                          {/* Badges */}
                          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                            {isUnlockedMoment && (
                              <div className="px-2.5 py-1 rounded-full bg-emerald-500/30 backdrop-blur-md border border-emerald-500/50 text-[10px] font-bold text-emerald-300 flex items-center gap-1 shadow-lg">
                                <Unlock className="w-3 h-3 text-emerald-400" />
                                <span>{isAuthorMe ? `You charge KES ${post.priceKes}` : `Unlocked`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Action Bar */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Like */}
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className="flex items-center gap-1.5 text-xs transition cursor-pointer group"
                      >
                        <Heart
                          className={`w-5 h-5 transition-transform group-active:scale-125 ${
                            post.hasLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'
                          }`}
                        />
                        <span className={`text-xs font-bold ${post.hasLiked ? 'text-rose-400' : 'text-slate-300'}`}>
                          {post.likesCount}
                        </span>
                      </button>

                      {/* Comments */}
                      <button
                        onClick={() => setCommentsDrawerPostId(post.id)}
                        className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-xs font-bold">{post.commentsCount}</span>
                      </button>

                      {/* Share */}
                      <button
                        onClick={() => handleShare(post.id)}
                        className="text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Actions Right: Suggest Community Note & Bookmark */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSuggestNoteTarget({
                            isOpen: true,
                            postId: post.id,
                            authorName: post.author.displayName,
                          })
                        }
                        className="text-slate-400 hover:text-amber-400 transition cursor-pointer p-1"
                        title="Suggest Community Note / Media Context"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleSave(post.id)}
                        className="text-slate-300 hover:text-rose-400 transition cursor-pointer"
                        title="Bookmark Post"
                      >
                        <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-xs text-slate-200 leading-relaxed font-normal">
                      <span
                        onClick={() => onOpenProfile && onOpenProfile(post.author.id)}
                        className="font-bold text-white mr-1.5 cursor-pointer hover:text-rose-300 transition"
                      >
                        @{post.author.username}
                      </span>
                      {post.caption}
                    </p>
                  )}

                  {/* Community Authenticity Note Banner */}
                  {post.communityNote && (
                    <div className="mt-2.5">
                      <CommunityNoteBanner note={post.communityNote} />
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}

        {/* Infinite Scroll Sentinel */}
        <div ref={loadMoreSentinelRef} className="py-4 flex flex-col items-center justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs text-rose-400 font-medium py-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading more moments...</span>
            </div>
          )}
          {!hasMore && posts.length > 0 && !searchQuery.trim() && (
            <div className="text-center py-4 text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>You&apos;re all caught up with moments!</span>
            </div>
          )}
        </div>
      </div>

      {/* Comments Drawer */}
      {commentsDrawerPostId && (
        <CommentsDrawer
          isOpen={!!commentsDrawerPostId}
          postId={commentsDrawerPostId}
          currentUserId={user?.id || ''}
          onClose={() => setCommentsDrawerPostId(null)}
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {
          fetchPosts();
          setIsCreatePostOpen(false);
        }}
      />

      {/* Suggest Community Note Modal for Posts */}
      {suggestNoteTarget.isOpen && (
        <SuggestCommunityNoteModal
          isOpen={suggestNoteTarget.isOpen}
          onClose={() => setSuggestNoteTarget({ isOpen: false, postId: '', authorName: '' })}
          targetType="POST"
          targetId={suggestNoteTarget.postId}
          targetName={suggestNoteTarget.authorName}
          onSuccess={() => {
            showToast('Community note submitted for review!');
          }}
        />
      )}

      {/* Unlock Moment Modal */}
      {unlockingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto select-none">
          <div className="relative w-full max-w-sm my-6 bg-[#121620] text-white rounded-3xl border border-white/10 shadow-2xl p-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Unlock Exclusive Moment</h3>
                  <p className="text-[10px] text-gray-400">By @{unlockingPost.author.username}</p>
                </div>
              </div>
              <button
                onClick={() => setUnlockingPost(null)}
                className="w-7 h-7 rounded-full bg-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {unlockError && (
              <div className="mt-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            {/* Blurred Preview Card */}
            <div className="mt-3.5 relative w-full h-36 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
              <img
                src={unlockingPost.media[0]?.mediaUrl}
                alt="Blurred preview"
                className="w-full h-full object-cover filter blur-xl scale-125 opacity-70"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-3">
                <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">Unlock Amount</span>
                <span className="text-2xl font-black text-white mt-0.5">KES {unlockingPost.priceKes || 50}</span>
                <span className="text-[10px] text-gray-300 mt-1">
                  {unlockingPost.media[0]?.mediaType === 'VIDEO' ? 'Exclusive Video' : 'Exclusive Photo'}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-4 flex rounded-xl bg-white/[0.06] p-1 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setUnlockMethod('WALLET')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  unlockMethod === 'WALLET' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallet Balance</span>
              </button>
              <button
                type="button"
                onClick={() => setUnlockMethod('MPESA')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  unlockMethod === 'MPESA' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>M-PESA STK</span>
              </button>
            </div>

            {/* Method 1: Wallet Balance */}
            {unlockMethod === 'WALLET' && (
              <div className="mt-3.5 space-y-3">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-gray-400">Available Wallet Balance:</span>
                  <span className="font-bold text-white font-mono">KES {user?.wallet?.balanceKes ?? 0}</span>
                </div>

                {(user?.wallet?.balanceKes ?? 0) < (unlockingPost.priceKes || 50) ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                    Insufficient balance. Switch to M-PESA STK above to pay directly from your Safaricom phone without depositing.
                  </div>
                ) : null}

                <button
                  onClick={() => handleWalletUnlock(unlockingPost)}
                  disabled={isUnlocking}
                  className="w-full py-2.5 rounded-full gradient-brand font-bold text-xs text-white shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Unlocking Moment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay KES {unlockingPost.priceKes || 50} from Wallet</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Method 2: Safaricom M-PESA STK Push */}
            {unlockMethod === 'MPESA' && (
              <div className="mt-3.5 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Safaricom Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-500">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="tel"
                      value={unlockPhone}
                      onChange={(e) => setUnlockPhone(e.target.value)}
                      placeholder="07XXXXXXXX or +254..."
                      className="w-full py-2 pl-9 pr-3 rounded-xl bg-gray-800/80 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {mpesaWaiting ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-2 animate-fade-in">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>STK Prompt Sent!</span>
                    </div>
                    <p className="text-[10px] text-emerald-200/80 leading-relaxed">
                      Please check your phone and enter your Safaricom M-PESA PIN to authorize KES {unlockingPost.priceKes || 50}.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMpesaUnlock(unlockingPost)}
                    disabled={isUnlocking || !unlockPhone.trim()}
                    className="w-full py-2.5 rounded-full gradient-brand font-bold text-xs text-white shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUnlocking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching STK Push...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5" />
                        <span>Send KES {unlockingPost.priceKes || 50} STK Prompt</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Timed View Once Modal */}
      {viewingTimedPost && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 animate-fade-in select-none">
          {/* Top Progress Bar */}
          <div className="w-full max-w-lg h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              style={{
                width: `${(remainingTime / (viewingTimedPost.durationSeconds || 300)) * 100}%`,
              }}
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400 transition-all duration-1000 ease-linear"
            />
          </div>

      {/* Moment Full-Screen Viewer Modal */}
      {viewingTimedPost && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 md:p-6 animate-fade-in select-none">
          {/* Top Bar with Author Info & Close */}
          <div className="w-full max-w-lg flex items-center justify-between pt-2 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-sm font-bold text-rose-300">
                {viewingTimedPost.author.displayName?.[0] || 'M'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{viewingTimedPost.author.displayName}</p>
                <p className="text-[10px] text-slate-400">@{viewingTimedPost.author.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!viewingTimedPost.isLocked && (
                <button
                  onClick={() => handleBurnPost(viewingTimedPost)}
                  className="px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition cursor-pointer"
                  title="Burn immediately and end access"
                >
                  Burn Early
                </button>
              )}
              <button
                onClick={() => {
                  setIsBlackedOut(false);
                  setViewingTimedPost(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media Container */}
          <div className="relative flex-1 w-full max-w-lg flex items-center justify-center p-2 my-auto overflow-hidden select-none">
            {viewingTimedPost.media[0]?.mediaType === 'VIDEO' ? (
              <video
                src={viewingTimedPost.media[0]?.mediaUrl}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl pointer-events-auto"
              />
            ) : (
              <img
                src={viewingTimedPost.media[0]?.mediaUrl}
                alt="Moment media"
                className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl pointer-events-auto"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            )}
          </div>

          {/* Caption */}
          <div className="w-full max-w-lg pb-3 text-center">
            <p className="text-[11px] text-slate-400">
              {viewingTimedPost.caption || 'Exclusive Moment'}
            </p>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
