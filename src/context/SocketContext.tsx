'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { IncomingCallModal, IncomingCallData } from '@/components/calls/IncomingCallModal';
import { LiveKitCallRoom } from '@/components/calls/LiveKitCallRoom';
import { ringtone } from '@/utils/ringtone';

interface TypingStatus {
  isTyping: boolean;
  username: string;
}

export interface ActiveCallState {
  roomName: string;
  isVideo: boolean;
  partnerName?: string;
  partnerAvatar?: string | null;
  partnerId?: string;
  isInitiator?: boolean;
}

export interface StartCallParams {
  recipientId: string;
  conversationId: string;
  isVideo: boolean;
  partnerName: string;
  partnerAvatar?: string | null;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<string>;
  isUserOnline: (userId?: string | null) => boolean;
  typingStatusByConversation: Record<string, TypingStatus>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  queryPresence: (userIds: string[]) => Promise<Record<string, boolean>>;
  incomingCall: IncomingCallData | null;
  activeCall: ActiveCallState | null;
  startCall: (params: StartCallParams) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5001';
    }
  }
  return 'https://socilalink-api-ab186685252b.herokuapp.com';
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUnreadCount } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingStatusByConversation, setTypingStatusByConversation] = useState<Record<string, TypingStatus>>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    // If not authenticated, disconnect if exists
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUserIds(new Set());
        setTypingStatusByConversation({});
      }
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Immediately refresh unread badge upon connection
      if (refreshUnreadCount) {
        refreshUnreadCount();
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket Connection Warning]:', err.message);
      setIsConnected(false);
    });

    // Presence updates
    newSocket.on('user:presence', (data: { userId: string; status: 'ONLINE' | 'OFFLINE'; lastSeenAt?: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.status === 'ONLINE') {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Typing updates
    newSocket.on(
      'typing:status',
      (data: { conversationId: string; userId: string; username: string; isTyping: boolean }) => {
        if (!data?.conversationId) return;

        // Clear existing expiration timer if any
        if (typingTimeoutRef.current[data.conversationId]) {
          clearTimeout(typingTimeoutRef.current[data.conversationId]);
          delete typingTimeoutRef.current[data.conversationId];
        }

        if (data.isTyping) {
          setTypingStatusByConversation((prev) => ({
            ...prev,
            [data.conversationId]: { isTyping: true, username: data.username },
          }));

          // Safety auto-expiration after 4 seconds
          typingTimeoutRef.current[data.conversationId] = setTimeout(() => {
            setTypingStatusByConversation((prev) => {
              const updated = { ...prev };
              delete updated[data.conversationId];
              return updated;
            });
          }, 4000);
        } else {
          setTypingStatusByConversation((prev) => {
            const updated = { ...prev };
            delete updated[data.conversationId];
            return updated;
          });
        }
      }
    );

    // Unread count update pushed from server
    newSocket.on('unread:update', (data: { unreadCount: number }) => {
      if (refreshUnreadCount) {
        refreshUnreadCount();
      }
    });

    // LiveKit Call Signaling
    newSocket.on('call:incoming', (data: IncomingCallData) => {
      setIncomingCall(data);
    });

    newSocket.on('call:accepted', (data: { roomName: string; isVideo: boolean }) => {
      ringtone.stop();
      setActiveCall((prev) =>
        prev
          ? { ...prev, roomName: data.roomName, isVideo: data.isVideo }
          : { roomName: data.roomName, isVideo: data.isVideo }
      );
    });

    newSocket.on('call:rejected', (data: { roomName: string; reason?: string }) => {
      ringtone.stop();
      alert(data.reason || 'Call was declined');
      setActiveCall(null);
    });

    newSocket.on('call:ended', () => {
      ringtone.stop();
      setActiveCall(null);
      setIncomingCall(null);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id]);

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (socket && isConnected && conversationId) {
        socket.emit('join:conversation', conversationId);
      }
    },
    [socket, isConnected]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (socket && isConnected && conversationId) {
        socket.emit('leave:conversation', conversationId);
      }
    },
    [socket, isConnected]
  );

  const emitTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      if (socket && isConnected && conversationId) {
        socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
      }
    },
    [socket, isConnected]
  );

  const isUserOnline = useCallback(
    (userId?: string | null): boolean => {
      if (!userId) return false;
      return onlineUserIds.has(userId);
    },
    [onlineUserIds]
  );

  const queryPresence = useCallback(
    (userIds: string[]): Promise<Record<string, boolean>> => {
      return new Promise((resolve) => {
        if (!socket || !isConnected) {
          resolve({});
          return;
        }

        socket.emit('presence:query', { userIds }, (presenceMap: Record<string, boolean>) => {
          if (presenceMap) {
            setOnlineUserIds((prev) => {
              const next = new Set(prev);
              Object.entries(presenceMap).forEach(([uid, isOnline]) => {
                if (isOnline) next.add(uid);
                else next.delete(uid);
              });
              return next;
            });
            resolve(presenceMap);
          } else {
            resolve({});
          }
        });
      });
    },
    [socket, isConnected]
  );

  const startCall = useCallback(
    (params: StartCallParams) => {
      const roomName = `call_${params.conversationId}_${Date.now()}`;
      ringtone.playOutgoing();
      if (socket && isConnected) {
        socket.emit('call:initiate', {
          recipientId: params.recipientId,
          roomName,
          isVideo: params.isVideo,
          conversationId: params.conversationId,
        });
      }
      setActiveCall({
        roomName,
        isVideo: params.isVideo,
        partnerName: params.partnerName,
        partnerAvatar: params.partnerAvatar,
        partnerId: params.recipientId,
        isInitiator: true,
      });
    },
    [socket, isConnected]
  );

  const acceptCall = useCallback(() => {
    ringtone.stop();
    if (!incomingCall) return;
    if (socket && isConnected) {
      socket.emit('call:accept', {
        callerId: incomingCall.callerId,
        roomName: incomingCall.roomName,
        isVideo: incomingCall.isVideo,
      });
    }
    setActiveCall({
      roomName: incomingCall.roomName,
      isVideo: incomingCall.isVideo,
      partnerName: incomingCall.callerName,
      partnerAvatar: incomingCall.callerAvatar,
      partnerId: incomingCall.callerId,
      isInitiator: false,
    });
    setIncomingCall(null);
  }, [socket, isConnected, incomingCall]);

  const rejectCall = useCallback(() => {
    ringtone.stop();
    if (!incomingCall) return;
    if (socket && isConnected) {
      socket.emit('call:reject', {
        callerId: incomingCall.callerId,
        roomName: incomingCall.roomName,
        reason: 'Call declined',
      });
    }
    setIncomingCall(null);
  }, [socket, isConnected, incomingCall]);

  const endCall = useCallback(() => {
    ringtone.stop();
    if (activeCall && activeCall.partnerId && socket && isConnected) {
      socket.emit('call:end', {
        recipientId: activeCall.partnerId,
        roomName: activeCall.roomName,
      });
    }
    setActiveCall(null);
    setIncomingCall(null);
  }, [socket, isConnected, activeCall]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        isUserOnline,
        typingStatusByConversation,
        joinConversation,
        leaveConversation,
        emitTyping,
        queryPresence,
        incomingCall,
        activeCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
      }}
    >
      {children}

      {/* Global Incoming Call Alert */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Global Active LiveKit Call Room */}
      {activeCall && (
        <LiveKitCallRoom
          roomName={activeCall.roomName}
          isVideo={activeCall.isVideo}
          partnerName={activeCall.partnerName}
          partnerAvatar={activeCall.partnerAvatar}
          isInitiator={activeCall.isInitiator}
          onDisconnected={endCall}
        />
      )}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
