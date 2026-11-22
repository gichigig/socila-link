'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, Trash2, ShieldCheck, MessageCircle, AlertCircle } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
}

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string | null;
  currentUserId: string;
  onCommentAdded?: () => void;
}

export function CommentsDrawer({
  isOpen,
  onClose,
  postId,
  currentUserId,
  onCommentAdded,
}: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.comments)) {
          setComments(data.comments);
        }
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
      setContent('');
      setError(null);
    }
  }, [isOpen, postId]);

  if (!isOpen || !postId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setContent('');
        if (onCommentAdded) onCommentAdded();
      } else {
        setError(data.error || 'Failed to post comment');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/v1/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm h-[520px] max-h-[85vh] bg-[#1A202C] text-white rounded-t-3xl sm:rounded-3xl border border-gray-700/60 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#F43F5E]" />
            <h3 className="text-sm font-bold text-white">Comments ({comments.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Comments Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400 animate-pulse">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No comments yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5 items-start group">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-700">
                  <img
                    src={
                      comment.user.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                    }
                    alt={comment.user.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 bg-gray-800/60 rounded-2xl p-2.5 border border-gray-700/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-white">
                        {comment.user.displayName}
                      </span>
                      {comment.user.isVerified && (
                        <ShieldCheck className="w-3 h-3 fill-[#38BDF8] text-black" />
                      )}
                    </div>
                    {comment.user.id === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-200 mt-0.5 leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700/60 bg-[#121721] flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            placeholder="Add a comment..."
            className="flex-1 py-2 px-3 rounded-full bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="w-8 h-8 rounded-full gradient-pink text-white flex items-center justify-center shrink-0 transition disabled:opacity-40 cursor-pointer shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

