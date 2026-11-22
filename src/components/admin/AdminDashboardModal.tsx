'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Users,
  AlertTriangle,
  Scale,
  Ban,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Lock,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  pendingReports: number;
  pendingDisputes: number;
  bannedUsers: number;
  pendingCommunityNotes?: number;
}

interface ReportItem {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  category: string;
  description?: string | null;
  status: string;
  createdAt: string;
  reporter?: {
    username: string;
    profile?: { displayName: string };
  };
}

interface DisputeItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  initiatedBy: {
    username: string;
    profile?: { displayName: string };
  };
  dateInvitation: {
    id: string;
    locationName: string;
    escrowAmountKes: number;
    inviter: { username: string; profile?: { displayName: string } };
    invitee: { username: string; profile?: { displayName: string } };
  };
}

interface CommunityNoteItem {
  id: string;
  targetType: string;
  targetId: string;
  category: string;
  content: string;
  status: string;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    profile?: { displayName: string; avatarUrl?: string | null };
  };
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDashboardModal({ isOpen, onClose }: AdminDashboardModalProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [communityNotes, setCommunityNotes] = useState<CommunityNoteItem[]>([]);
  const [tab, setTab] = useState<'reports' | 'disputes' | 'notes'>('reports');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, reportsRes, disputesRes, notesRes] = await Promise.all([
        fetch('/api/v1/admin/stats'),
        fetch('/api/v1/admin/reports?status=PENDING'),
        fetch('/api/v1/admin/disputes'),
        fetch('/api/v1/admin/community-notes?status=ALL'),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.data);
      }
      if (reportsRes.ok) {
        const rData = await reportsRes.json();
        setReports(rData.data || []);
      }
      if (disputesRes.ok) {
        const dData = await disputesRes.json();
        setDisputes(dData.data || []);
      }
      if (notesRes.ok) {
        const nData = await notesRes.json();
        setCommunityNotes(nData.data || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAdminData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResolveReport = async (reportId: string, action: 'RESOLVE' | 'DISMISS') => {
    setActionLoadingId(reportId);
    try {
      const res = await fetch(`/api/v1/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: `Action taken by admin: ${action}`,
        }),
      });

      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error resolving report:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveDispute = async (
    disputeId: string,
    action: 'REFUND_CLIENT' | 'PAY_COMPANION'
  ) => {
    setActionLoadingId(disputeId);
    try {
      const res = await fetch(`/api/v1/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: `Administrative mediation: ${action}`,
        }),
      });

      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error resolving dispute:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReviewNote = async (
    noteId: string,
    action: 'APPROVE' | 'REJECT' | 'REVOKE'
  ) => {
    setActionLoadingId(noteId);
    try {
      const res = await fetch(`/api/v1/admin/community-notes/${noteId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: `Admin moderation action: ${action}`,
        }),
      });

      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error reviewing community note:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getNoteCategoryBadge = (category: string) => {
    switch (category) {
      case 'IDENTITY_MISMATCH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'BAIT_AND_SWITCH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'STOLEN_MEDIA':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'MISLEADING_PROFILE':
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0F141F] rounded-3xl border border-rose-500/30 p-5 shadow-2xl text-white max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-pink flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Trust & Safety Console</h3>
              <p className="text-[10px] text-gray-400">Incident Moderation & Dispute Mediation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              className="p-1.5 rounded-full bg-gray-800 text-gray-300 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-2 my-3">
            <div className="p-2 rounded-2xl bg-[#161D2A] border border-gray-800 text-center">
              <Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
              <span className="text-[9px] text-gray-400 block">Total Users</span>
              <span className="text-xs font-mono font-bold text-white">{stats.totalUsers}</span>
            </div>

            <div className="p-2 rounded-2xl bg-[#161D2A] border border-gray-800 text-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
              <span className="text-[9px] text-gray-400 block">Reports</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {stats.pendingReports}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-[#161D2A] border border-gray-800 text-center">
              <Scale className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
              <span className="text-[9px] text-gray-400 block">Disputes</span>
              <span className="text-xs font-mono font-bold text-purple-400">
                {stats.pendingDisputes}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-[#161D2A] border border-gray-800 text-center">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mx-auto mb-1" />
              <span className="text-[9px] text-gray-400 block">Notes Queue</span>
              <span className="text-xs font-mono font-bold text-rose-400">
                {stats.pendingCommunityNotes || 0}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-[#161D2A] border border-gray-800 text-center">
              <Ban className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
              <span className="text-[9px] text-gray-400 block">Suspended</span>
              <span className="text-xs font-mono font-bold text-red-400">{stats.bannedUsers}</span>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-900 rounded-xl mb-3">
          <button
            onClick={() => setTab('reports')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'reports'
                ? 'gradient-pink text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Incident Reports ({reports.length})
          </button>

          <button
            onClick={() => setTab('disputes')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'disputes'
                ? 'gradient-pink text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Date Disputes ({disputes.length})
          </button>

          <button
            onClick={() => setTab('notes')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'notes'
                ? 'gradient-pink text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Community Notes</span>
            {communityNotes.filter((n) => n.status === 'PROPOSED').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {communityNotes.filter((n) => n.status === 'PROPOSED').length}
              </span>
            )}
          </button>
        </div>

        {/* Stream Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <span className="text-xs">Loading queue...</span>
            </div>
          ) : tab === 'reports' ? (
            reports.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-white">All clear!</p>
                <p className="text-[11px] text-gray-500 mt-0.5">No pending reports in the queue.</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="p-3 rounded-2xl bg-[#161D2A] border border-gray-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px] border border-rose-500/40">
                      {report.category}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-gray-300 text-xs">
                    {report.description || 'No description provided'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-800/80">
                    <span className="text-[10px] text-gray-400">
                      Target: {report.targetType} • ID: {report.targetId.slice(0, 8)}...
                    </span>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleResolveReport(report.id, 'RESOLVE')}
                        disabled={actionLoadingId === report.id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px]"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(report.id, 'DISMISS')}
                        disabled={actionLoadingId === report.id}
                        className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-[10px]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : tab === 'disputes' ? (
            disputes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-white">No active disputes!</p>
                <p className="text-[11px] text-gray-500 mt-0.5">All date escrows are in good order.</p>
              </div>
            ) : (
              disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="p-3.5 rounded-2xl bg-[#161D2A] border border-gray-800 text-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/40">
                      Dispute #{dispute.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      KES {dispute.dateInvitation.escrowAmountKes.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-gray-200 text-xs">
                    <span className="font-semibold text-rose-400">Reason:</span> {dispute.reason}
                  </p>

                  <div className="p-2 rounded-xl bg-[#121721] text-[11px] text-gray-400 space-y-0.5">
                    <div>Client: {dispute.dateInvitation.inviter.profile?.displayName || dispute.dateInvitation.inviter.username}</div>
                    <div>Companion: {dispute.dateInvitation.invitee.profile?.displayName || dispute.dateInvitation.invitee.username}</div>
                    <div>Venue: {dispute.dateInvitation.locationName}</div>
                  </div>

                  {dispute.status === 'PENDING' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleResolveDispute(dispute.id, 'REFUND_CLIENT')}
                        disabled={actionLoadingId === dispute.id}
                        className="py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                      >
                        Refund Client (100%)
                      </button>

                      <button
                        onClick={() => handleResolveDispute(dispute.id, 'PAY_COMPANION')}
                        disabled={actionLoadingId === dispute.id}
                        className="py-1.5 rounded-xl gradient-pink text-white font-bold text-xs shadow-md"
                      >
                        Release to Companion (90%)
                      </button>
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            /* Community Notes Moderation Stream */
            communityNotes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-white">No community notes pending!</p>
                <p className="text-[11px] text-gray-500 mt-0.5">All identity and content context notes have been moderated.</p>
              </div>
            ) : (
              communityNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 rounded-2xl bg-[#161D2A] border border-gray-800 text-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getNoteCategoryBadge(
                          note.category
                        )}`}
                      >
                        {note.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Target: {note.targetType} • {note.targetId.slice(0, 8)}...
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                        note.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : note.status === 'REJECTED'
                          ? 'bg-gray-800 text-gray-400 border-gray-700'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {note.status}
                    </span>
                  </div>

                  {/* Note Context Body */}
                  <div className="p-2.5 rounded-xl bg-[#121721] border border-gray-800/80 text-gray-200">
                    <p className="text-xs leading-relaxed font-normal">
                      &ldquo;{note.content}&rdquo;
                    </p>
                  </div>

                  {/* Author & Votes Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-800/80 text-[11px] text-gray-400">
                    <div className="flex items-center gap-3">
                      <span>
                        By: <span className="text-white font-medium">@{note.author.username}</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{note.helpfulCount}</span>
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <ThumbsDown className="w-3 h-3" />
                          <span>{note.notHelpfulCount}</span>
                        </span>
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {note.status === 'PROPOSED' && (
                        <>
                          <button
                            onClick={() => handleReviewNote(note.id, 'APPROVE')}
                            disabled={actionLoadingId === note.id}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer"
                          >
                            Approve & Strike
                          </button>
                          <button
                            onClick={() => handleReviewNote(note.id, 'REJECT')}
                            disabled={actionLoadingId === note.id}
                            className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-[10px] transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {note.status === 'APPROVED' && (
                        <button
                          onClick={() => handleReviewNote(note.id, 'REVOKE')}
                          disabled={actionLoadingId === note.id}
                          className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-[10px] transition cursor-pointer"
                        >
                          Revoke Strike
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

