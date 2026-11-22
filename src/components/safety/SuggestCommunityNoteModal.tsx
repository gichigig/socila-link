'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, AlertTriangle, Image as ImageIcon, Send, Loader2 } from 'lucide-react';

interface SuggestCommunityNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'PROFILE' | 'POST' | 'DATE';
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

const CATEGORIES = [
  {
    id: 'IDENTITY_MISMATCH',
    title: 'Identity Mismatch (Different Person)',
    description: 'The person in-person or on camera differs significantly from their profile photos (catfish).',
    icon: ShieldAlert,
  },
  {
    id: 'BAIT_AND_SWITCH',
    title: 'Companion Date Bait & Switch',
    description: 'A different individual arrived or attempted to fulfill a companion date booking.',
    icon: AlertTriangle,
  },
  {
    id: 'STOLEN_MEDIA',
    title: 'Stolen Photos or Media',
    description: 'Photos or videos belong to another known creator or model without attribution.',
    icon: ImageIcon,
  },
  {
    id: 'MISLEADING_PROFILE',
    title: 'Misleading Details or Age',
    description: 'False claims about identity, location, age, or companionship rates.',
    icon: Sparkles,
  },
];

export function SuggestCommunityNoteModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onSuccess,
}: SuggestCommunityNoteModalProps) {
  const [category, setCategory] = useState<string>('IDENTITY_MISMATCH');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) {
      setError('Please provide at least 10 characters of factual context.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/safety/community-notes/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          category,
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit community note proposal.');
        return;
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitted(false);
        setContent('');
        onClose();
      }, 2000);
    } catch {
      setError('Could not reach safety server. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[32px] glass-panel border border-white/10 shadow-2xl p-5 text-left space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Suggest Community Note</h3>
              <p className="text-[10px] text-slate-400">For {targetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-10 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full gradient-brand mx-auto flex items-center justify-center text-white shadow-xl shadow-rose-500/30">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-base font-black text-white">Community Note Submitted</h4>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              Thank you for keeping SociLaLink authentic. Your note will be reviewed by community raters and Trust &amp; Safety moderators before appearing publicly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Guidance Callout */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300 space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Factual Context Rules
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Community Notes must be objective, respectful, and based on firsthand experience. Submissions are reviewed by moderators before publication.
              </p>
            </div>

            {/* Category Radio Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Select Category</label>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/10 shadow-md shadow-rose-500/15'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'gradient-brand text-white' : 'bg-white/[0.06] text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {cat.title}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-relaxed block mt-0.5">
                          {cat.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Context Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-300">Context Explanation</label>
                <span className={`text-[10px] font-mono ${content.length > 250 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {content.length}/280
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 280))}
                required
                rows={3}
                placeholder="Explain the discrepancy clearly (e.g. 'Photos in this profile appear to be from model @handle, in-person appearance differs significantly...')"
                className="w-full p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || content.trim().length < 10}
                className="flex-1 py-2.5 px-4 rounded-xl gradient-brand text-xs font-bold text-white shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Note</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

