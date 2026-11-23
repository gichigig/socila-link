'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Plus,
  Send,
  ShieldCheck,
  Check,
  CheckCheck,
  Loader2,
  CalendarHeart,
  MapPin,
  PhoneCall,
  X,
} from 'lucide-react';
import { LockedMediaBubble } from './LockedMediaBubble';
import { ViewOnceBubble } from './ViewOnceBubble';
import { AttachMediaModal } from './AttachMediaModal';
import { CallLogBubble } from '@/components/calls/CallLogBubble';
import { LiveLocationBubble } from '@/components/location/LiveLocationBubble';
import { ShareLiveLocationModal } from '@/components/location/ShareLiveLocationModal';
import { isVideoMedia } from '@/utils/media';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

interface MessageSender {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  isMine: boolean;
  type: string; // TEXT, IMAGE, LOCKED_MEDIA, VIEW_ONCE_MEDIA
  content?: string | null;
  mediaUrl?: string | null;
  lockedMedia?: any | null;
  viewOnceMedia?: any | null;
  createdAt: string;
  sender: MessageSender;
}

interface ConversationPartner {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  companionRateKes?: number | null;
  phone?: string | null;
}

interface ChatConversationViewProps {
  conversationId: string;
  partner: ConversationPartner;
  onBack: () => void;
  onOpenDateInvite?: (partner: ConversationPartner) => void;
  onOpenProfile?: (userId: string) => void;
}

export function ChatConversationView({
  conversationId,
  partner,
  onBack,
  onOpenDateInvite,
  onOpenProfile,
}: ChatConversationViewProps) {
  const { user, refreshUnreadCount } = useAuth();
  const {
    socket,
    isConnected,
    isUserOnline,
    typingStatusByConversation,
    joinConversation,
    leaveConversation,
    emitTyping,
    startCall,
  } = useSocket();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isShareLocationOpen, setIsShareLocationOpen] = useState(false);
  const [showVoiceCallOptions, setShowVoiceCallOptions] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Pagination & Older Messages State
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const prevCountRef = useRef(0);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Virtual Keyboard offset tracker for mobile screens
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;

    const handleViewportChange = () => {
      if (window.innerWidth >= 1024) {
        setKeyboardOffset(0);
        return;
      }

      if (!vv) return;

      const windowH = window.innerHeight;
      const visibleH = vv.height;
      const offsetTop = vv.offsetTop || 0;
      const diff = Math.max(0, windowH - (visibleH + offsetTop));

      if (diff > 80) {
        setKeyboardOffset(Math.round(diff));
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setKeyboardOffset(0);
      }
    };

    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  const handleInputFocus = () => {
    setTimeout(() => {
      if (window.visualViewport) {
        const windowH = window.innerHeight;
        const visibleH = window.visualViewport.height;
        const offsetTop = window.visualViewport.offsetTop || 0;
        const diff = Math.max(0, windowH - (visibleH + offsetTop));
        if (diff > 80) {
          setKeyboardOffset(Math.round(diff));
        }
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (window.visualViewport) {
        const windowH = window.innerHeight;
        const visibleH = window.visualViewport.height;
        const offsetTop = window.visualViewport.offsetTop || 0;
        const diff = Math.max(0, windowH - (visibleH + offsetTop));
        if (diff <= 80) {
          setKeyboardOffset(0);
        }
      } else {
        setKeyboardOffset(0);
      }
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    }, 100);
  };

  const isPartnerOnline = isUserOnline(partner.id);
  const partnerTyping = typingStatusByConversation[conversationId];

  const sortMessagesChronologically = (list: MessageItem[]): MessageItem[] => {
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setMessages(sortMessagesChronologically(data.data || []));
        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));
        if (refreshUnreadCount) {
          refreshUnreadCount();
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!nextCursor || loadingOlder || !hasMore) return;
    setLoadingOlder(true);

    const container = messagesContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    try {
      const res = await fetch(
        `/api/v1/conversations/${conversationId}/messages?limit=30&cursor=${nextCursor}`
      );
      if (res.ok) {
        const data = await res.json();
        const olderList: MessageItem[] = (data.data || []).map((m: any) => ({
          ...m,
          isMine: m.senderId === user?.id,
        }));

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const freshOlder = olderList.filter((m) => !existingIds.has(m.id));
          return sortMessagesChronologically([...freshOlder, ...prev]);
        });

        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));

        // Seamlessly maintain viewport position after prepending older messages
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
          }
        });
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Scroll listener on messages container for upward pagination
  const handleContainerScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || loadingOlder || !hasMore) return;

    if (container.scrollTop < 60) {
      loadOlderMessages();
    }
  };

  // Initial load + Real-Time WebSocket join & message listener
  useEffect(() => {
    prevCountRef.current = 0;
    fetchMessages();

    // Join real-time conversation room
    joinConversation(conversationId);

    const handleIncomingMessage = (newMsg: any) => {
      if (newMsg.conversationId !== conversationId) return;

      setMessages((prev) => {
        // Prevent duplicate append
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const formatted: MessageItem = {
          ...newMsg,
          isMine: newMsg.senderId === user?.id,
        };
        return sortMessagesChronologically([...prev, formatted]);
      });

      if (refreshUnreadCount) {
        refreshUnreadCount();
      }
    };

    if (socket) {
      socket.on('message:new', handleIncomingMessage);
    }

    // Fallback polling: relaxed 30s interval if connected, 8s if disconnected
    const pollIntervalMs = isConnected ? 30000 : 8000;
    const interval = setInterval(() => {
      fetchMessages();
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
      leaveConversation(conversationId);
      if (socket) {
        socket.off('message:new', handleIncomingMessage);
      }
    };
  }, [conversationId, socket, isConnected, joinConversation, leaveConversation, user?.id]);

  useEffect(() => {
    if (messages.length > prevCountRef.current && !loadingOlder) {
      scrollToBottom(prevCountRef.current === 0 ? 'auto' : 'smooth');
    }
    prevCountRef.current = messages.length;
  }, [messages.length, loadingOlder]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputContent(val);

    // Emit typing indicator
    if (val.trim()) {
      emitTyping(conversationId, true);

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      // Debounce typing cessation after 2.5 seconds
      typingTimerRef.current = setTimeout(() => {
        emitTyping(conversationId, false);
      }, 2500);
    } else {
      emitTyping(conversationId, false);
    }
  };

  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputContent.trim();
    if (!trimmed || sending) return;

    // Immediately cancel typing indicator on send
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    emitTyping(conversationId, false);

    setSending(true);
    setInputContent('');
    setInputContent('');

    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEXT',
          content: trimmed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== data.data.id);
          return sortMessagesChronologically([...filtered, data.data]);
        });
      }
    } catch (err) {
      console.error('Failed to send text message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendSpecialAttachment = async (payload: any) => {
    const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== data.data.id);
        return sortMessagesChronologically([...filtered, data.data]);
      });
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to dispatch attachment');
    }
  };

  const showQuickNotice = (msg: string) => {
    setInfoNotice(msg);
    setTimeout(() => setInfoNotice(null), 3000);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden transition-[padding-bottom] duration-150 ease-out"
      style={{
        paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
      }}
    >
      {/* Toast Notice */}
      {infoNotice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-rose-500/90 text-white text-xs font-semibold shadow-lg animate-fade-in">
          {infoNotice}
        </div>
      )}

      {/* Screen 5 Header */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 border-b border-gray-800/80 bg-[#121721] rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Back to conversation list"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div
            onClick={() => onOpenProfile && onOpenProfile(partner.id)}
            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-90 transition group"
            title={`View ${partner.displayName}'s profile`}
          >
            <div className="relative shrink-0">
              <img
                src={
                  partner.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                }
                alt={partner.displayName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-rose-500/40 group-hover:border-rose-400 transition"
              />
              {/* Real-Time Online / Offline Indicator */}
              {isPartnerOnline ? (
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#121721] shadow-sm shadow-emerald-500/50 animate-pulse"
                  title="Online now"
                />
              ) : (
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-500 border-2 border-[#121721]"
                  title="Offline"
                />
              )}
            </div>

            <div className="flex flex-col min-w-0 ml-1">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-white group-hover:text-rose-300 transition truncate max-w-[85px] xs:max-w-[130px] sm:max-w-[200px]">
                  {partner.displayName}
                </span>
                {partner.isVerified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
              </div>
              {partnerTyping?.isTyping ? (
                <span className="text-[10px] text-rose-400 font-bold animate-pulse">typing...</span>
              ) : isPartnerOnline ? (
                <span className="text-[10px] text-emerald-400 font-medium">Online</span>
              ) : (
                <span className="text-[10px] text-slate-400">Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 xs:gap-1.5 text-gray-400 shrink-0">
          {onOpenDateInvite && (
            <button
              onClick={() => onOpenDateInvite(partner)}
              title="Direct companion date booking with safe M-PESA escrow"
              className="py-1 px-2 xs:px-2.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-[10px] xs:text-[11px] font-bold transition flex items-center gap-1 shadow-sm shadow-rose-500/10 cursor-pointer active:scale-95 shrink-0"
            >
              <CalendarHeart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="hidden xs:inline">
                {partner.companionRateKes
                  ? `Meet • KES ${partner.companionRateKes.toLocaleString()}`
                  : 'Meet • Invite'}
              </span>
              <span className="xs:hidden">Meet</span>
            </button>
          )}

          <button
            onClick={() => {
              if (partner.phone) {
                setShowVoiceCallOptions(true);
              } else {
                startCall({
                  recipientId: partner.id,
                  conversationId,
                  isVideo: false,
                  partnerName: partner.displayName || partner.username,
                  partnerAvatar: partner.avatarUrl,
                });
              }
            }}
            className="p-1.5 sm:p-2 rounded-full hover:text-white hover:bg-gray-800 transition-colors cursor-pointer text-emerald-400"
            title={partner.phone ? 'Call Options (In-App or Phone App)' : 'Start Voice Call'}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              startCall({
                recipientId: partner.id,
                conversationId,
                isVideo: true,
                partnerName: partner.displayName || partner.username,
                partnerAvatar: partner.avatarUrl,
              });
            }}
            className="p-1.5 sm:p-2 rounded-full hover:text-white hover:bg-gray-800 transition-colors cursor-pointer text-pink-400"
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream with Upward Infinite Scroll */}
      <div
        ref={messagesContainerRef}
        onScroll={handleContainerScroll}
        onTouchStart={() => {
          if (document.activeElement === inputRef.current) {
            inputRef.current?.blur();
          }
        }}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3"
      >
        {/* Load Earlier Messages Trigger / Spinner */}
        {hasMore && (
          <div className="py-2 flex justify-center">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] text-slate-300 font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loadingOlder ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                  <span>Loading earlier messages...</span>
                </>
              ) : (
                <span>Load earlier messages</span>
              )}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading message thread...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400 p-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
              <Send className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-gray-300">It's a Match! Say hello to {partner.displayName}</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
              Send a warm greeting, share a photo, or send an exclusive locked preview.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.isMine;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            if (msg.type === 'CALL_LOG') {
              return (
                <CallLogBubble
                  key={msg.id}
                  content={msg.content}
                  isMine={isMine}
                  createdAt={msg.createdAt}
                  onCallBack={(isVideo) => {
                    startCall({
                      recipientId: partner.id,
                      conversationId,
                      isVideo,
                      partnerName: partner.displayName || partner.username,
                      partnerAvatar: partner.avatarUrl,
                    });
                  }}
                />
              );
            }

            if (msg.type === 'LIVE_LOCATION' || msg.type === 'PINNED_LOCATION') {
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} w-full`}
                >
                  <LiveLocationBubble
                    messageId={msg.id}
                    conversationId={conversationId}
                    content={msg.content}
                    isMine={isMine}
                    partnerName={partner.displayName || partner.username}
                    partnerAvatar={partner.avatarUrl}
                    createdAt={msg.createdAt}
                  />
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500 px-1">
                    <span>{timeStr}</span>
                    {isMine && <CheckCheck className="w-3 h-3 text-rose-400" />}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                {/* 1. TEXT MESSAGE */}
                {msg.type === 'TEXT' && (
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                      isMine
                        ? 'gradient-pink text-white rounded-br-xs'
                        : 'bg-[#1E2533] text-gray-100 rounded-bl-xs border border-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}

                {/* 2. REGULAR PHOTO OR VIDEO MESSAGE */}
                {(msg.type === 'IMAGE' || msg.type === 'VIDEO') && msg.mediaUrl && (
                  <div className="max-w-[78%] rounded-2xl overflow-hidden my-1 shadow-md border border-gray-800 bg-black">
                    {msg.type === 'VIDEO' || isVideoMedia(msg.mediaUrl) ? (
                      <div className="relative">
                        <video
                          src={msg.mediaUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-72 w-full object-contain rounded-2xl bg-black"
                        />
                      </div>
                    ) : (
                      <img
                        src={msg.mediaUrl}
                        alt="Shared photo"
                        className="max-h-64 w-full object-cover"
                      />
                    )}
                    {msg.content && (
                      <p className="p-2 text-xs bg-[#1E2533] text-gray-200">{msg.content}</p>
                    )}
                  </div>
                )}

                {/* 3. LOCKED MEDIA BUBBLE (SCREEN 6) */}
                {msg.type === 'LOCKED_MEDIA' && msg.lockedMedia && (
                  <div className="max-w-[85%]">
                    {msg.content && (
                      <p className="text-xs text-gray-300 mb-1 px-1">{msg.content}</p>
                    )}
                    <LockedMediaBubble
                      messageId={msg.id}
                      isMine={isMine}
                      lockedMedia={msg.lockedMedia}
                      onUnlocked={(fullUrl) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === msg.id && m.lockedMedia
                              ? {
                                  ...m,
                                  lockedMedia: {
                                    ...m.lockedMedia,
                                    isUnlocked: true,
                                    fullMediaUrl: fullUrl,
                                  },
                                }
                              : m
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* 4. VIEW ONCE BUBBLE (SCREEN 7) */}
                {msg.type === 'VIEW_ONCE_MEDIA' && msg.viewOnceMedia && (
                  <div className="max-w-[80%]">
                    {msg.content && (
                      <p className="text-xs text-gray-300 mb-1 px-1">{msg.content}</p>
                    )}
                    <ViewOnceBubble
                      messageId={msg.id}
                      isMine={isMine}
                      viewOnceMedia={msg.viewOnceMedia}
                      onStatusChange={(newStatus) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === msg.id && m.viewOnceMedia
                              ? {
                                  ...m,
                                  viewOnceMedia: {
                                    ...m.viewOnceMedia,
                                    status: newStatus,
                                  },
                                }
                              : m
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* Timestamp & read check */}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 px-1">
                  <span>{timeStr}</span>
                  {isMine && <CheckCheck className="w-3 h-3 text-rose-400" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bubble */}
      {partnerTyping?.isTyping && (
        <div className="shrink-0 px-4 py-1.5 flex items-center gap-2 bg-[#121721]/90 border-t border-white/[0.04] text-xs text-rose-300 select-none animate-fade-in">
          <span className="text-[11px] font-semibold">{partner.displayName} is typing</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Screen 5 Bottom Input Bar */}
      <form
        onSubmit={handleSendTextMessage}
        className="shrink-0 p-2 sm:p-2.5 bg-[#121721] border-t border-gray-800 flex items-center gap-2 rounded-b-2xl"
      >
        <button
          type="button"
          onClick={() => setIsAttachOpen(true)}
          className="w-9 h-9 rounded-full bg-[#1E2533] hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          title="Attach locked media or view-once photo"
        >
          <Plus className="w-5 h-5 text-rose-400" />
        </button>

        <button
          type="button"
          onClick={() => setIsShareLocationOpen(true)}
          className="w-9 h-9 rounded-full bg-[#1E2533] hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          title="Share location or pin a place on map"
        >
          <MapPin className="w-4 h-4 text-pink-400" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputContent}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Type a message..."
          className="flex-1 bg-[#1A202C] border border-gray-700/80 rounded-full px-4 py-2 text-base sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
        />

        <button
          type="submit"
          disabled={!inputContent.trim() || sending}
          className="w-9 h-9 rounded-full gradient-pink text-white flex items-center justify-center shadow-md shadow-rose-500/20 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:hover:opacity-40 transition-all flex-shrink-0 cursor-pointer"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Special Attachment Drawer Modal */}
      <AttachMediaModal
        isOpen={isAttachOpen}
        onClose={() => setIsAttachOpen(false)}
        onSend={handleSendSpecialAttachment}
      />

      {/* Share Live Location Modal */}
      {isShareLocationOpen && (
        <ShareLiveLocationModal
          isOpen={isShareLocationOpen}
          conversationId={conversationId}
          onClose={() => setIsShareLocationOpen(false)}
          onSendLiveLocation={handleSendSpecialAttachment}
        />
      )}

      {/* Voice Call Mode Selector (when confirmed date partner has shared phone) */}
      {showVoiceCallOptions && partner.phone && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-800 p-6 flex flex-col items-center text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Call @{partner.username}</h3>
              <p className="text-xs text-gray-400 mt-1">
                Choose how you want to connect with your date partner.
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowVoiceCallOptions(false);
                  startCall({
                    recipientId: partner.id,
                    conversationId,
                    isVideo: false,
                    partnerName: partner.displayName || partner.username,
                    partnerAvatar: partner.avatarUrl,
                  });
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gray-800 hover:bg-gray-750 text-white font-bold text-xs flex items-center justify-between transition cursor-pointer border border-gray-700/60"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">In-App Voice Call</div>
                    <div className="text-[10px] text-gray-400">Free, encrypted, zero mobile minutes</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Free</span>
              </button>

              <a
                href={`tel:${partner.phone}`}
                onClick={() => setShowVoiceCallOptions(false)}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-white font-bold text-xs flex items-center justify-between transition cursor-pointer border border-emerald-500/40"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-300 text-xs">Cellular Phone Call</div>
                    <div className="text-[10px] text-gray-400">Dials {partner.phone} via your phone app</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cellular</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowVoiceCallOptions(false)}
              className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

