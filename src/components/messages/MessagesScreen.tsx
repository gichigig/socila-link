'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Heart,
  Loader2,
  RefreshCw,
  MapPin,
  Radio,
  Phone,
  PhoneMissed,
  PhoneOff,
  Video,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';
import { ChatConversationView } from './ChatConversationView';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

interface ConversationItem {
  id: string;
  type: string;
  matchId?: string | null;
  lastMessageAt: string;
  unreadCount: number;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
    locationCity?: string | null;
    companionRateKes?: number | null;
  };
  lastMessage?: {
    id: string;
    type: string;
    content: string;
    createdAt: string;
    isMine: boolean;
  } | null;
}

export function ConversationPreviewSnippet({
  type,
  content,
}: {
  type?: string;
  content?: string | null;
}) {
  if (!type && !content) {
    return <span className="text-gray-500 italic">No messages yet</span>;
  }
  const rawType = type || '';

  // 1. PINNED_LOCATION or LIVE_LOCATION
  if (rawType === 'PINNED_LOCATION' || rawType === 'LIVE_LOCATION') {
    let locName = rawType === 'PINNED_LOCATION' ? 'Pinned Place' : 'Live Location';
    let isLive = rawType === 'LIVE_LOCATION';
    try {
      if (content && content.startsWith('{')) {
        const data = JSON.parse(content);
        if (data.locationName) locName = data.locationName;
        if (data.isLive) isLive = true;
      }
    } catch {}

    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
          <Radio className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Live Location{locName !== 'Live Location' ? ` (${locName})` : ''}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        <span>{locName}</span>
      </span>
    );
  }

  // 2. CALL_LOG
  if (rawType === 'CALL_LOG') {
    let isVideo = false;
    let status = '';
    let durationSeconds = 0;
    try {
      if (content && content.startsWith('{')) {
        const data = JSON.parse(content);
        isVideo = data.callType === 'VIDEO';
        status = data.status || '';
        durationSeconds = data.durationSeconds || 0;
      }
    } catch {}

    const label = isVideo ? 'Video Call' : 'Voice Call';
    let text = label;
    if (status === 'MISSED') {
      text = `Missed ${label}`;
      return (
        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
          <PhoneMissed className="w-3.5 h-3.5 shrink-0" />
          <span>{text}</span>
        </span>
      );
    }
    if (status === 'DECLINED') {
      text = `Declined ${label}`;
      return (
        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
          <PhoneOff className="w-3.5 h-3.5 shrink-0" />
          <span>{text}</span>
        </span>
      );
    }
    if (durationSeconds > 0) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      text = `${label} (${durStr})`;
    }

    return (
      <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
        {isVideo ? (
          <Video className="w-3.5 h-3.5 shrink-0 text-pink-400" />
        ) : (
          <Phone className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
        )}
        <span>{text}</span>
      </span>
    );
  }

  // 3. Media Types
  if (rawType === 'LOCKED_MEDIA') {
    return (
      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span>Locked Media</span>
      </span>
    );
  }
  if (rawType === 'VIEW_ONCE_MEDIA') {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>View-once Media</span>
      </span>
    );
  }
  if (rawType === 'IMAGE') {
    return (
      <span className="inline-flex items-center gap-1 text-gray-300">
        <ImageIcon className="w-3.5 h-3.5 shrink-0 text-gray-400" />
        <span>Photo</span>
      </span>
    );
  }
  if (rawType === 'VIDEO') {
    return (
      <span className="inline-flex items-center gap-1 text-pink-300">
        <Video className="w-3.5 h-3.5 shrink-0 text-pink-400" />
        <span>Video Clip</span>
      </span>
    );
  }

  // 4. Defensive check if content happens to be raw JSON string
  if (content && content.startsWith('{')) {
    try {
      const data = JSON.parse(content);
      if (data.isPinned || (data.latitude && data.longitude)) {
        return (
          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{data.locationName || 'Pinned Place'}</span>
          </span>
        );
      }
      if (data.callType) {
        const isVideo = data.callType === 'VIDEO';
        return (
          <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
            {isVideo ? (
              <Video className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            ) : (
              <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span>{isVideo ? 'Video' : 'Voice'} Call</span>
          </span>
        );
      }
    } catch {}
  }

  return <span>{content || 'Attachment'}</span>;
}

function formatConversationPreview(type?: string, content?: string | null): string {
  if (!type && !content) return 'No messages yet';
  const rawType = type || '';
  if (rawType === 'PINNED_LOCATION') return 'Pinned Place';
  if (rawType === 'LIVE_LOCATION') return 'Live Location';
  if (rawType === 'CALL_LOG') return 'Call Log';
  if (rawType === 'LOCKED_MEDIA') return 'Locked Media';
  if (rawType === 'VIEW_ONCE_MEDIA') return 'View-once Media';
  if (rawType === 'IMAGE') return 'Photo';
  if (rawType === 'VIDEO') return 'Video Clip';
  return content || 'Attachment';
}

interface MatchItem {
  id: string;
  matchedAt: string;
  partner: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
    companionRateKes?: number | null;
  };
}

interface MessagesScreenProps {
  initialPartnerId?: string | null;
  onExploreMatches?: () => void;
  onOpenDateInvite?: (partner: any) => void;
  onOpenProfile?: (userId: string) => void;
  onConversationActiveChange?: (isActive: boolean) => void;
}

export function MessagesScreen({
  initialPartnerId,
  onExploreMatches,
  onOpenDateInvite,
  onOpenProfile,
  onConversationActiveChange,
}: MessagesScreenProps) {
  const { refreshUnreadCount } = useAuth();
  const { socket, isConnected, isUserOnline, queryPresence } = useSocket();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [startingChatWithId, setStartingChatWithId] = useState<string | null>(null);
  const hasAutoStartedRef = useRef<string | null>(null);

  // Notify parent layout when deep conversation screen opens or closes
  useEffect(() => {
    onConversationActiveChange?.(Boolean(activeConversation));
  }, [activeConversation, onConversationActiveChange]);

  // Fetch conversations and new matches
  const fetchData = async () => {
    try {
      const [convosRes, matchesRes] = await Promise.all([
        fetch('/api/v1/conversations'),
        fetch('/api/v1/matches'),
      ]);

      if (convosRes.ok) {
        const data = await convosRes.json();
        const convosList = data.data || [];
        setConversations(convosList);
        if (refreshUnreadCount) {
          refreshUnreadCount();
        }

        // Query presence for all partners
        const partnerIds = convosList.map((c: any) => c.otherUser?.id).filter(Boolean);
        if (partnerIds.length > 0 && queryPresence) {
          queryPresence(partnerIds);
        }
      }

      if (matchesRes.ok) {
        const mData = await matchesRes.json();
        const matchList = mData.data || [];
        setMatches(matchList);

        // Query presence for matches
        const matchPartnerIds = matchList.map((m: any) => m.partner?.id).filter(Boolean);
        if (matchPartnerIds.length > 0 && queryPresence) {
          queryPresence(matchPartnerIds);
        }
      }
    } catch (err) {
      console.error('Error fetching messaging data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Relaxed polling interval when WebSockets are connected
    const pollIntervalMs = isConnected ? 45000 : 10000;
    const interval = setInterval(() => {
      fetchData();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Real-time message listener for instant conversation snippet & unread bump
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg: any) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === newMsg.conversationId);
        if (index === -1) {
          fetchData();
          return prev;
        }

        const current = prev[index];
        const updated = {
          ...current,
          lastMessageAt: newMsg.createdAt,
          lastMessage: {
            id: newMsg.id,
            type: newMsg.type,
            content: newMsg.content || '',
            createdAt: newMsg.createdAt,
            isMine: newMsg.isMine,
          },
          unreadCount:
            activeConversation?.id === newMsg.conversationId
              ? current.unreadCount
              : current.unreadCount + 1,
        };

        const others = prev.filter((c) => c.id !== newMsg.conversationId);
        return [updated, ...others];
      });

      if (refreshUnreadCount) {
        refreshUnreadCount();
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, activeConversation?.id, refreshUnreadCount]);

  // Handle auto-opening conversation if initialPartnerId is passed
  useEffect(() => {
    if (initialPartnerId && !loading && hasAutoStartedRef.current !== initialPartnerId) {
      hasAutoStartedRef.current = initialPartnerId;
      const found = conversations.find((c) => c.otherUser?.id === initialPartnerId);
      if (found) {
        setActiveConversation(found);
      } else {
        handleStartConversation(initialPartnerId);
      }
    }
  }, [initialPartnerId, loading, conversations]);

  const handleStartConversation = async (targetUserId: string, matchId?: string) => {
    setStartingChatWithId(targetUserId);
    try {
      const res = await fetch('/api/v1/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, matchId }),
      });

      if (res.ok) {
        const data = await res.json();
        const convo = data.data;
        const formattedConvo: ConversationItem = {
          id: convo.id,
          type: convo.type,
          matchId: convo.matchId,
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          otherUser: convo.otherUser,
          lastMessage: null,
        };

        // Add to list if not already present
        setConversations((prev) => {
          if (!prev.some((c) => c.id === convo.id)) {
            return [formattedConvo, ...prev];
          }
          return prev;
        });

        setActiveConversation(formattedConvo);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setStartingChatWithId(null);
    }
  };

  // If a conversation is active, render the Chat View (Screen 5)
  if (activeConversation) {
    return (
      <ChatConversationView
        conversationId={activeConversation.id}
        partner={activeConversation.otherUser}
        onBack={() => {
          setActiveConversation(null);
          onConversationActiveChange?.(false);
          fetchData(); // refresh list and unread counts
        }}
        onOpenDateInvite={onOpenDateInvite}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  // Filter conversations by search term
  const filteredConversations = conversations.filter((c) => {
    if (!c.otherUser) return false;
    const nameMatch = c.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const usernameMatch = c.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || usernameMatch;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0E14] text-white">
      {/* Header */}
      <div className="p-3 pb-2 border-b border-gray-800/80 bg-[#121721] rounded-t-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">Messages</h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full gradient-pink text-white text-[11px] font-bold">
                {totalUnread} new
              </span>
            )}
          </div>
          <button
            onClick={fetchData}
            title="Refresh conversations"
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#1A202C] border border-gray-700/60 rounded-full pl-8 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* New Matches Row (Horizontal Carousel) */}
        {matches.length > 0 && (
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500" /> New Matches
              </span>
              <span className="text-[10px] text-gray-500">{matches.length} matches</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => handleStartConversation(match.partner.id, match.id)}
                  disabled={startingChatWithId === match.partner.id}
                  className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
                >
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 shadow-md group-hover:scale-105 transition-transform">
                    <img
                      src={
                        match.partner.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                      }
                      alt={match.partner.displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#121721]"
                    />
                    {isUserOnline(match.partner.id) && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#121721] shadow-sm shadow-emerald-500/50 animate-pulse"
                        title="Online now"
                      />
                    )}
                    {startingChatWithId === match.partner.id && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-300 font-medium mt-1 truncate max-w-[56px]">
                    {match.partner.displayName.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
              <MessageCircle className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-white">No messages yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
              When you match with people in Discover or start chatting, your conversations will show up here.
            </p>
            {onExploreMatches && (
              <button
                onClick={onExploreMatches}
                className="mt-4 px-4 py-2 rounded-xl gradient-pink text-white text-xs font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore Matches</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {filteredConversations.map((convo) => {
              const partner = convo.otherUser;
              if (!partner) return null;

              const timeStr = new Date(convo.lastMessageAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={convo.id}
                  onClick={() => setActiveConversation(convo)}
                  className="flex items-center gap-3 p-3 hover:bg-[#161D2A] transition-colors cursor-pointer"
                >
                  {/* Partner Avatar with Online Dot */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        partner.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                      }
                      alt={partner.displayName}
                      className="w-12 h-12 rounded-full object-cover border border-gray-700/80"
                    />
                    {isUserOnline(partner.id) && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0B0E14] shadow-sm shadow-emerald-500/50 animate-pulse"
                        title="Online now"
                      />
                    )}
                  </div>

                  {/* Conversation Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-bold text-xs text-white truncate max-w-[130px]">
                          {partner.displayName}
                        </span>
                        {partner.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 truncate pr-2 flex items-center">
                        {convo.lastMessage ? (
                          <>
                            {convo.lastMessage.isMine && (
                              <span className="text-gray-500 mr-1 shrink-0">You: </span>
                            )}
                            <ConversationPreviewSnippet
                              type={convo.lastMessage.type}
                              content={convo.lastMessage.content}
                            />
                          </>
                        ) : (
                          <span className="text-gray-500 italic">No messages yet</span>
                        )}
                      </p>

                      {convo.unreadCount > 0 && (
                        <span className="flex-shrink-0 w-4 h-4 rounded-full gradient-pink text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

