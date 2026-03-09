import React, { useState } from 'react';
import { UserPlus, Mail, User, CheckCircle2, Clock, XCircle, Copy, Send, Loader2, AlertCircle, X } from 'lucide-react';
import { InvitationStatus } from '../../../types';
import { useInvitations, useCreateInvitation, useResendInvitation, useRevokeInvitation } from '../../../api/invitation';
import { usePatients } from '../../../api/patient';
import toast from '../../../lib/toast';

export default function CaregiverInvitationScreen() {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');

  // Fetch data
  const { data: invitationsData, isLoading, error } = useInvitations();
  const { data: patientsData } = usePatients();

  const invitations = invitationsData || [];
  const patients = patientsData?.patients || [];

  // Mutations
  const createMutation = useCreateInvitation();
  const resendMutation = useResendInvitation();
  const revokeMutation = useRevokeInvitation();

  // Check for pre-selected patient
  React.useEffect(() => {
    const selectedPatientId = localStorage.getItem('selectedPatientId');
    if (selectedPatientId) {
      setPatientId(selectedPatientId);
      setShowModal(true);
      localStorage.removeItem('selectedPatientId');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !caregiverName.trim() || !caregiverEmail.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        patientId,
        caregiverName: caregiverName.trim(),
        caregiverEmail: caregiverEmail.trim(),
        expiresInDays: 7,
      });
      toast.success(`Invitation sent to ${caregiverEmail}`);
      setShowModal(false);
      setPatientId('');
      setCaregiverName('');
      setCaregiverEmail('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invitation');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resend = async (id: string, email: string) => {
    try {
      await resendMutation.mutateAsync(id);
      toast.success(`Resent to ${email}`);
    } catch {
      toast.error('Failed to resend');
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this invitation?')) return;
    try {
      await revokeMutation.mutateAsync(id);
      toast.success('Invitation revoked');
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const getStatusBadge = (status: InvitationStatus) => {
    const styles = {
      [InvitationStatus.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200',
      [InvitationStatus.ACCEPTED]: 'bg-green-50 text-green-700 border-green-200',
      [InvitationStatus.DECLINED]: 'bg-red-50 text-red-700 border-red-200',
      [InvitationStatus.EXPIRED]: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const icons = {
      [InvitationStatus.PENDING]: <Clock size={12} />,
      [InvitationStatus.ACCEPTED]: <CheckCircle2 size={12} />,
      [InvitationStatus.DECLINED]: <XCircle size={12} />,
      [InvitationStatus.EXPIRED]: <XCircle size={12} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  // Show caregiver's active status for accepted invitations
  const getCaregiverStatus = (inv: any) => {
    if (inv.status !== InvitationStatus.ACCEPTED) return null;

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 size={12} />
        Active
      </span>
    );
  };

  const filteredInvitations = filter === 'all'
    ? invitations
    : invitations.filter((inv: any) => inv.status.toLowerCase() === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-slate-600">Failed to load invitations</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-slate-900 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-white border-2 border-zinc-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Caregiver Invitations</h1>
          <p className="text-zinc-500 text-xs mt-1 font-bold">INVITE CAREGIVERS TO JOIN PATIENT CARE</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 border border-zinc-800 rounded-none text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
        >
          <UserPlus size={16} /> NEW INVITATION
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-0 mb-6 border-b border-zinc-200">
        {(['all', 'pending', 'accepted'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${filter === f
              ? 'border-b-2 border-zinc-900 text-zinc-900 bg-zinc-50'
              : 'text-zinc-400 hover:text-zinc-600'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Invitations List */}
      <div className="bg-white border-2 border-zinc-200">
        {filteredInvitations.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {filteredInvitations.map((inv: any) => (
              <div key={inv.id} className="p-6 hover:bg-zinc-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 border-2 border-zinc-200 flex items-center justify-center text-sm font-black text-zinc-900 bg-zinc-50">
                      {inv.caregiverName?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-zinc-900 uppercase tracking-tight">{inv.caregiverName}</span>
                        {getStatusBadge(inv.status)}
                        {getCaregiverStatus(inv)}
                      </div>
                      <p className="text-sm text-zinc-500 mb-2 font-mono">{inv.caregiverEmail}</p>
                      <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        <span>FOR: {inv.patientName}</span>
                        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                        <span>EXPIRES: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => copyCode(inv.invitationCode)}
                      className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white border border-zinc-800 text-[10px] font-mono tracking-widest hover:bg-zinc-800 transition-colors"
                    >
                      {inv.invitationCode}
                      <Copy size={12} className={copiedCode === inv.invitationCode ? 'text-green-400' : ''} />
                    </button>

                    {inv.status === InvitationStatus.PENDING && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => resend(inv.id, inv.caregiverEmail)}
                          disabled={resendMutation.isPending}
                          className="px-3 py-2 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                          RESEND
                        </button>
                        <button
                          onClick={() => revoke(inv.id)}
                          disabled={revokeMutation.isPending}
                          className="px-3 py-2 border border-red-200 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors"
                        >
                          REVOKE
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-zinc-50">
            <div className="w-16 h-16 border-2 border-zinc-200 flex items-center justify-center mx-auto mb-4 bg-white">
              <UserPlus size={32} className="text-zinc-300" />
            </div>
            <p className="text-zinc-900 font-black uppercase tracking-widest">No invitations found</p>
            <p className="text-xs text-zinc-400 mt-2 font-bold uppercase tracking-tight">Send your first invitation to begin onboarding</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden">
            <div className="bg-zinc-900 px-8 py-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Invite Caregiver</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all font-bold uppercase"
                  required
                >
                  <option value="">CHOOSE A PATIENT...</option>
                  {patients.map((p: any) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.fullName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Caregiver Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all font-bold uppercase placeholder:text-zinc-300"
                    placeholder="FULL NAME"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Caregiver Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={caregiverEmail}
                    onChange={(e) => setCaregiverEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all font-mono placeholder:text-zinc-300"
                    placeholder="EMAIL@EXAMPLE.COM"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-zinc-200 text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white border-2 border-zinc-900 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  SEND INVITATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
