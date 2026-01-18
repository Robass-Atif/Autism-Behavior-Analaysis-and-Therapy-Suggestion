import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Search, CheckCircle, XCircle, Clock, Mail, FileText, Loader2,
  Building2, X, UserCheck, UserX, Calendar, Award, RefreshCw,
  Shield, ChevronRight, Eye, Download
} from 'lucide-react';
import UserProfileDetails from './UserProfileDetails';
import { useTherapistApplications, useApproveTherapistApplication, useRejectTherapistApplication } from '../../../api/admin';

interface Application {
  id: string;
  therapistId: string;
  fullName: string;
  email: string;
  licenseNumber?: string;
  licenseType?: string;
  organizationName?: string;
  submittedAt: string;
  status: string;
  licenseCertificate?: string;
}

interface TherapistApplicationsScreenProps {
  onBack: () => void;
}

// Confirmation Modal Component
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'green' | 'red';
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border-2 border-zinc-200 max-w-md w-full font-mono" onClick={(e) => e.stopPropagation()}>
        <div className={`px-6 py-4 flex items-center justify-between ${confirmColor === 'green' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          <h3 className="font-bold uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-zinc-700 text-sm">{message}</p>
        </div>
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-zinc-200 text-zinc-700 text-xs uppercase tracking-wider hover:bg-zinc-100"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-white text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 ${confirmColor === 'green' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Rejection Modal with Reason Input
const RejectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  applicantName: string;
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, applicantName, isLoading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border-2 border-zinc-200 max-w-lg w-full font-mono" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserX size={20} />
            <h3 className="font-bold uppercase tracking-wider">REJECT_APPLICATION</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-red-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-zinc-700 text-sm mb-4">
            Rejecting application from <strong className="text-zinc-900">{applicantName}</strong>.
            Provide a reason:
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-4 py-3 border-2 border-zinc-200 focus:outline-none focus:border-black resize-none h-32 text-sm font-mono"
          />
        </div>
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-zinc-200 text-zinc-700 text-xs uppercase tracking-wider hover:bg-zinc-100"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
            className="flex-1 py-2.5 bg-red-600 text-white text-xs uppercase tracking-wider hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            REJECT
          </button>
        </div>
      </div>
    </div>
  );
};

const TherapistApplicationsScreen: React.FC<TherapistApplicationsScreenProps> = ({ onBack }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approveModal, setApproveModal] = useState<{ isOpen: boolean; app: Application | null }>({
    isOpen: false,
    app: null,
  });
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; app: Application | null }>({
    isOpen: false,
    app: null,
  });
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useTherapistApplications(
    selectedStatus !== 'all' ? selectedStatus : undefined
  );

  const approveMutation = useApproveTherapistApplication();
  const rejectMutation = useRejectTherapistApplication();

  const applications = data?.applications || [];

  const handleApprove = async () => {
    if (!approveModal.app) return;

    try {
      await approveMutation.mutateAsync({ id: approveModal.app.id });
      toast.success(`${approveModal.app.fullName} approved successfully`);
      setApproveModal({ isOpen: false, app: null });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve application');
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectModal.app) return;

    try {
      await rejectMutation.mutateAsync({ id: rejectModal.app.id, reason });
      toast.success(`${rejectModal.app.fullName} has been rejected`);
      setRejectModal({ isOpen: false, app: null });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject application');
    }
  };

  const filteredApplications = applications.filter((app) =>
    app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending_approval' || a.status === 'pending_verification').length,
    approved: applications.filter(a => a.status === 'active').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending_approval: { label: 'PENDING', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
    pending_verification: { label: 'VERIFYING', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
    active: { label: 'APPROVED', color: 'text-green-700', bg: 'bg-green-100 border-green-200' },
    rejected: { label: 'REJECTED', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-zinc-50 font-mono">
        {/* Header */}
        <div className="bg-black text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 border border-white/20">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight uppercase">THERAPIST_APPLICATIONS</h1>
                <p className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
                  REVIEW AND MANAGE REGISTRATION REQUESTS
                </p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} />
              REFRESH
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border-2 border-zinc-200 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">TOTAL</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 p-4">
              <div className="text-xs text-amber-600 uppercase mb-1">PENDING</div>
              <div className="text-3xl font-bold text-amber-700">{stats.pending}</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 p-4">
              <div className="text-xs text-green-600 uppercase mb-1">APPROVED</div>
              <div className="text-3xl font-bold text-green-700">{stats.approved}</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 p-4">
              <div className="text-xs text-red-600 uppercase mb-1">REJECTED</div>
              <div className="text-3xl font-bold text-red-700">{stats.rejected}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-2 border-zinc-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH_BY_NAME_OR_EMAIL..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-zinc-200 bg-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                {[
                  { value: 'all', label: 'ALL' },
                  { value: 'pending_approval', label: 'PENDING' },
                  { value: 'active', label: 'APPROVED' },
                  { value: 'rejected', label: 'REJECTED' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedStatus(filter.value)}
                    className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors border-2 ${selectedStatus === filter.value
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white border-2 border-zinc-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase tracking-wider border-b-2 border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left">APPLICANT</th>
                  <th className="px-4 py-3 text-left">LICENSE</th>
                  <th className="px-4 py-3 text-left">ORGANIZATION</th>
                  <th className="px-4 py-3 text-left">SUBMITTED</th>
                  <th className="px-4 py-3 text-left">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 size={24} className="animate-spin mx-auto text-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 uppercase">LOADING_APPLICATIONS...</p>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-sm">
                      NO_APPLICATIONS_FOUND
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending_approval;
                    const isPending = app.status === 'pending_approval' || app.status === 'pending_verification';

                    return (
                      <tr key={app.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-zinc-200 text-zinc-600'
                              }`}>
                              {app.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-900">{app.fullName}</div>
                              <div className="text-xs text-zinc-500">{app.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-600">
                          {app.licenseType && app.licenseNumber ? (
                            <div>
                              <div className="font-medium">{app.licenseType}</div>
                              <div className="text-xs text-zinc-400">{app.licenseNumber}</div>
                            </div>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-600">
                          {app.organizationName || <span className="text-zinc-400">-</span>}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-500">
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => setApproveModal({ isOpen: true, app })}
                                  disabled={approveMutation.isPending}
                                  className="px-3 py-1.5 bg-green-600 text-white text-xs uppercase tracking-wider hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <CheckCircle size={12} />
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => setRejectModal({ isOpen: true, app })}
                                  disabled={rejectMutation.isPending}
                                  className="px-3 py-1.5 border-2 border-red-200 text-red-600 text-xs uppercase tracking-wider hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <XCircle size={12} />
                                  REJECT
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => { setExpandedApp(app.id); }}
                                className="px-3 py-1.5 border-2 border-zinc-200 text-zinc-600 text-xs uppercase tracking-wider hover:bg-zinc-50 hover:border-zinc-300 flex items-center gap-1"
                              >
                                <Eye size={12} />
                                VIEW
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-8 bg-black text-white px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-6">
              <span className="text-zinc-500">TOTAL_APPLICATIONS:</span>
              <span>{stats.total}</span>
              <span className="text-zinc-500">PENDING_REVIEW:</span>
              <span className="text-amber-400">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-zinc-500" />
              <span className="text-zinc-400">ADMIN_REVIEW_REQUIRED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, app: null })}
        onConfirm={handleApprove}
        title="APPROVE_APPLICATION"
        message={`Approve ${approveModal.app?.fullName}'s application? They will gain access to the therapist portal.`}
        confirmText="APPROVE"
        confirmColor="green"
        isLoading={approveMutation.isPending}
      />

      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, app: null })}
        onConfirm={handleReject}
        applicantName={rejectModal.app?.fullName || ''}
        isLoading={rejectMutation.isPending}
      />

      {/* View Application Details Modal */}
      {expandedApp && (
        <UserProfileDetails
          userId={expandedApp}
          isOpen={!!expandedApp}
          onClose={() => setExpandedApp(null)}
          title="APPLICATION_DETAILS"
          actions={
            <>
              <button
                onClick={() => {
                  const app = applications.find(a => a.id === expandedApp);
                  setExpandedApp(null);
                  if (app) setApproveModal({ isOpen: true, app });
                }}
                className="px-4 py-2 bg-green-600 text-white text-xs uppercase tracking-wider hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle size={14} /> APPROVE_APPLICATION
              </button>
              <button
                onClick={() => {
                  const app = applications.find(a => a.id === expandedApp);
                  setExpandedApp(null);
                  if (app) setRejectModal({ isOpen: true, app });
                }}
                className="px-4 py-2 border-2 border-red-200 text-red-600 text-xs uppercase tracking-wider hover:bg-red-50 flex items-center gap-2"
              >
                <XCircle size={14} /> REJECT_APPLICATION
              </button>
            </>
          }
        />
      )}
    </>
  );
};

export default TherapistApplicationsScreen;
