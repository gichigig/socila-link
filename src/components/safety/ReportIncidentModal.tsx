'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'USER' | 'POST' | 'MESSAGE' | 'STORY' | 'DATE';
  targetId: string;
  targetName?: string;
}

const REPORT_CATEGORIES = [
  { value: 'HARASSMENT', label: 'Harassment or Bullying', desc: 'Offensive messages, threats or hate speech' },
  { value: 'SCAM', label: 'Scam or Financial Fraud', desc: 'Asking for unverified transfers or phishing' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content', desc: 'Explicit media or policy violations' },
  { value: 'NO_SHOW', label: 'Date No-Show', desc: 'Companion or client failed to attend agreed meeting' },
  { value: 'IMPERSONATION', label: 'Fake Profile / Impersonation', desc: 'Stolen photos or pretending to be someone else' },
  { value: 'SPAM', label: 'Spam or Bot Activity', desc: 'Commercial ads or automated spamming' },
  { value: 'OTHER', label: 'Other Issue', desc: 'Other safety or policy concern' },
];

export function ReportIncidentModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportIncidentModalProps) {
  const [category, setCategory] = useState('HARASSMENT');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/safety/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          category,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message || 'Error submitting report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121721] rounded-3xl border border-rose-500/30 p-5 shadow-2xl text-white overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-gray-800 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="py-6 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-white">Report Submitted</h3>
            <p className="text-xs text-gray-300 leading-relaxed px-2">
              Thank you for keeping SociLaLink safe. Our trust and moderation team has received your report and will investigate promptly.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 rounded-xl gradient-pink text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Report an Incident</h3>
                <p className="text-[10px] text-gray-400">
                  {targetName ? `Reporting ${targetName}` : `Reporting ${targetType.toLowerCase()}`}
                </p>
              </div>
            </div>

            {/* Category Radio / List */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                Reason for Report
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`w-full p-2 rounded-xl border text-left text-xs transition-all ${
                      category === cat.value
                        ? 'bg-rose-500/15 border-rose-500 text-white'
                        : 'bg-[#1A202C] border-gray-800 text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    <span className="font-semibold block text-[11px]">{cat.label}</span>
                    <span className="text-[10px] text-gray-400 block">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred..."
                className="w-full bg-[#1A202C] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl gradient-pink text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Incident Report</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

