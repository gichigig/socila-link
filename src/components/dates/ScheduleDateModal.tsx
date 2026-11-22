'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  CalendarHeart,
  MessageSquare,
} from 'lucide-react';

interface DateItem {
  id: string;
  isInviter: boolean;
  role: 'CLIENT' | 'COMPANION';
  status: string;
  locationName: string;
  locationAddress?: string | null;
  scheduledAt: string;
  durationHours: number;
  escrowAmountKes: number;
  notes?: string | null;
  partner: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface ScheduleDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateItem: DateItem | null;
  mode: 'accept_and_schedule' | 'reschedule';
  existingDates: DateItem[];
  onSuccess: () => void;
}

export function ScheduleDateModal({
  isOpen,
  onClose,
  dateItem,
  mode,
  existingDates,
  onSuccess,
}: ScheduleDateModalProps) {
  if (!isOpen || !dateItem) return null;

  const initialDateObj = new Date(dateItem.scheduledAt);

  // Format to local YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format to local HH:MM
  const formatLocalTime = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const todayStr = formatLocalDate(new Date());

  const [dateStr, setDateStr] = useState(formatLocalDate(initialDateObj));
  const [timeStr, setTimeStr] = useState(formatLocalTime(initialDateObj));
  const [durationHours, setDurationHours] = useState(dateItem.durationHours || 2);
  const [locationName, setLocationName] = useState(dateItem.locationName || '');
  const [notes, setNotes] = useState(dateItem.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute other dates scheduled on the selected day
  const sameDayDates = useMemo(() => {
    return existingDates.filter((other) => {
      if (other.id === dateItem.id) return false;
      if (other.status === 'CANCELLED' || other.status === 'DECLINED') return false;
      const otherDate = new Date(other.scheduledAt);
      return formatLocalDate(otherDate) === dateStr;
    });
  }, [existingDates, dateItem.id, dateStr]);

  // Check if candidate time conflicts with another date on that day (within duration window)
  const conflict = useMemo(() => {
    if (!dateStr || !timeStr) return null;
    const candidateStart = new Date(`${dateStr}T${timeStr}:00`).getTime();
    if (isNaN(candidateStart)) return null;
    const candidateEnd = candidateStart + durationHours * 3600 * 1000;

    for (const other of sameDayDates) {
      const otherStart = new Date(other.scheduledAt).getTime();
      const otherEnd = otherStart + (other.durationHours || 2) * 3600 * 1000;

      // Overlap condition
      if (candidateStart < otherEnd && candidateEnd > otherStart) {
        return other;
      }
    }
    return null;
  }, [dateStr, timeStr, durationHours, sameDayDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const combinedDateTime = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(combinedDateTime.getTime())) {
        throw new Error('Please enter a valid date and time');
      }

      const isoScheduledAt = combinedDateTime.toISOString();

      const endpoint =
        mode === 'accept_and_schedule'
          ? `/api/v1/dates/${dateItem.id}/accept`
          : `/api/v1/dates/${dateItem.id}/reschedule`;

      const payload = {
        scheduledAt: isoScheduledAt,
        durationHours: Number(durationHours),
        locationName: locationName.trim() || dateItem.locationName,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update date schedule');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update date schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#161D2A] border border-gray-800 rounded-3xl p-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md">
              <CalendarHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'accept_and_schedule' ? 'Schedule & Accept Date' : 'Reschedule Date Meeting'}
              </h3>
              <p className="text-[11px] text-gray-400">
                With @{dateItem.partner.username} • {dateItem.partner.displayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Requested Time Banner */}
        <div className="mt-3 p-3 rounded-2xl bg-[#121721] border border-gray-800/80 text-xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            {mode === 'accept_and_schedule' ? 'Requested Schedule' : 'Current Schedule'}
          </div>
          <div className="flex items-center justify-between text-gray-200">
            <span className="font-semibold text-rose-300">
              {new Date(dateItem.scheduledAt).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at{' '}
              {new Date(dateItem.scheduledAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({dateItem.durationHours} hrs)
            </span>
            <span className="text-emerald-400 font-bold">
              KES {dateItem.escrowAmountKes.toLocaleString()}
            </span>
          </div>
          <div className="text-gray-400 text-[11px] truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{dateItem.locationName}</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Schedule Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Meeting Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                  className="w-full bg-[#121721] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  required
                  className="w-full bg-[#121721] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full bg-[#121721] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours (Standard)</option>
                <option value={3}>3 hours</option>
                <option value={4}>4 hours</option>
                <option value={6}>6 hours (Half Day)</option>
                <option value={8}>8 hours (Full Day)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Meeting Venue
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Java House, Sarit Centre"
                required
                className="w-full bg-[#121721] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          {/* Same-day schedule display */}
          {sameDayDates.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Your Schedule on {new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}:</span>
              </div>
              <div className="space-y-1">
                {sameDayDates.map((d) => {
                  const dObj = new Date(d.scheduledAt);
                  const dTime = dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-[11px] text-amber-200/90 pl-4 border-l-2 border-amber-500/40"
                    >
                      <span>
                        {dTime} ({d.durationHours}h) • {d.locationName}
                      </span>
                      <span className="text-[10px] text-amber-300 font-medium">@{d.partner.username}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conflict Warning */}
          {conflict && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Schedule Conflict Warning</span>
                <span className="text-[11px] text-rose-200 leading-tight block">
                  You already have a date booked with @{conflict.partner.username} around this time (
                  {new Date(conflict.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
                  You may choose a different time or proceed if intentional.
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Note or Counter-Message to Client (Optional)
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Saturday afternoon works great for me! Looking forward to meeting you."
                rows={2}
                maxLength={500}
                className="w-full bg-[#121721] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Mutual Agreement Notice when rescheduling */}
          {mode === 'reschedule' && (
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[11px] leading-relaxed flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                Saving will send this reschedule proposal to @{dateItem.partner.username}. The meeting schedule updates once they agree.
              </span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl gradient-pink text-white font-bold text-xs shadow-md shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {mode === 'accept_and_schedule' ? 'Updating...' : 'Sending Proposal...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {mode === 'accept_and_schedule'
                      ? 'Confirm & Accept Date'
                      : `Propose to @${dateItem.partner.username}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
