import React, { useState, useMemo } from 'react';
import {
  CalendarPlus,
  Calendar,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  User,
  Flag,
} from 'lucide-react';
import {
  useCaregiverSchedule,
  useCreateScheduleEntry,
  useDeleteScheduleEntry,
  ScheduleEntry,
} from '../../../api/schedule';
import { usePatients } from '../../../api/patient';
import { useInvitations } from '../../../api/invitation';
import toast from '../../../lib/toast';

// ─── helpers ────────────────────────────────────────────────────────────────
function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'bg-zinc-900',    text: 'text-white',     label: 'PENDING' },
  completed: { bg: 'bg-emerald-700', text: 'text-white',     label: 'DONE' },
  missed:    { bg: 'bg-red-600',     text: 'text-white',     label: 'MISSED' },
};

const ACTION_TYPES = [
  'Arm Swing',
  'Frog Pose',
  'Body Swing',
  'Hand Flapping',
  'Rocking',
  'Spinning',
  'Social Interaction',
  'Communication Exercise',
  'Sensory Play',
  'Other',
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function TherapistScheduleScreen() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedCaregiver, setSelectedCaregiver] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [actionType, setActionType] = useState('');
  const [customAction, setCustomAction] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'missed'>('all');

  const monthKey = getMonthKey(currentDate);

  // API hooks
  const { data: patients = [], isLoading: patientsLoading } = usePatients();
  const { data: invitations = [], isLoading: invLoading } = useInvitations();
  const { data: entries = [], isLoading: schedLoading } = useCaregiverSchedule(monthKey);
  const createMutation = useCreateScheduleEntry();
  const deleteMutation = useDeleteScheduleEntry();

  const actualPatients = (patients as any)?.patients || patients || [];

  // All accepted invitations (these caregivers have accounts)
  const acceptedInvitations = useMemo(
    () => (invitations as any[]).filter(
      (inv: any) => inv.status?.toUpperCase() === 'ACCEPTED' && inv.caregiverUserId,
    ),
    [invitations],
  );

  // Derive caregivers available for a selected patient
  const caregiversForPatient = useMemo(() => {
    if (!selectedPatientId) return acceptedInvitations;
    return acceptedInvitations.filter(
      (inv: any) => {
        const invPatientId = inv.patientId?.toString();
        return invPatientId === selectedPatientId;
      },
    );
  }, [selectedPatientId, acceptedInvitations]);

  // Tab-filtered entries
  const filtered = useMemo(() => {
    if (activeTab === 'all') return entries;
    return entries.filter((e) => e.status === activeTab);
  }, [entries, activeTab]);

  // Month navigation
  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaregiver) return toast.error('Please select a caregiver');
    if (!selectedPatientId) return toast.error('Please select a patient');
    if (!actionType && !customAction) return toast.error('Please select an action type');
    if (!scheduledDate) return toast.error('Please set a scheduled date');

    // Get patient name
    const patient = actualPatients.find(
      (p: any) => (p._id || p.id) === selectedPatientId,
    );

    try {
      await createMutation.mutateAsync({
        caregiverId: selectedCaregiver.id,
        caregiverName: selectedCaregiver.name,
        patientId: selectedPatientId,
        patientName: patient?.fullName || 'Unknown Patient',
        actionType: actionType === 'Other' ? customAction : actionType,
        scheduledDate: new Date(scheduledDate).toISOString(),
        timeSlot,
        notes,
      });
      toast.success(`Task assigned to ${selectedCaregiver.name}`);
      // reset form
      setShowModal(false);
      setSelectedPatientId('');
      setSelectedCaregiver(null);
      setActionType('');
      setCustomAction('');
      setScheduledDate('');
      setTimeSlot('');
      setNotes('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create schedule entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this schedule entry?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Entry removed');
    } catch {
      toast.error('Failed to remove entry');
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-10 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
              CAREGIVER MANAGEMENT
            </h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              Recording Tasks
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
              ASSIGN &amp; MANAGE CAREGIVER RECORDING SCHEDULE
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-black uppercase tracking-widest text-sm min-w-[10rem] text-center">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all"
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="ml-4 flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
            >
              <CalendarPlus size={16} /> ASSIGN TASK
            </button>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'TOTAL', count: entries.length, color: 'text-zinc-900' },
            { label: 'PENDING',   count: entries.filter(e => e.status === 'pending').length,   color: 'text-amber-600' },
            { label: 'COMPLETED', count: entries.filter(e => e.status === 'completed').length, color: 'text-emerald-700' },
            { label: 'MISSED',    count: entries.filter(e => e.status === 'missed').length,    color: 'text-red-600' },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-zinc-50 border-2 border-zinc-100 p-4 text-center">
              <div className={`text-4xl font-black ${color}`}>{count}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b-2 border-zinc-100 mb-6">
          {(['all', 'pending', 'completed', 'missed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-zinc-900 text-zinc-900 -mb-[2px] bg-white'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Entry list */}
        {schedLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-zinc-300" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-200 p-16 text-center">
            <Calendar size={32} className="mx-auto text-zinc-200 mb-4" />
            <p className="font-black uppercase tracking-widest text-zinc-400 text-sm">
              No tasks for {monthLabel}
            </p>
            <p className="text-xs text-zinc-300 mt-2 font-bold uppercase tracking-wide">
              Click "ASSIGN TASK" to add one
            </p>
          </div>
        ) : (
          <div className="border-2 border-zinc-100 divide-y divide-zinc-100">
            {filtered.map((entry) => {
              const style = STATUS_STYLES[entry.status] || STATUS_STYLES.pending;
              const d = new Date(entry.scheduledDate);
              return (
                <div key={entry._id} className="p-5 hover:bg-zinc-50 transition-colors flex items-start gap-6">
                  {/* Date block */}
                  <div className="flex-shrink-0 w-14 text-center border-2 border-zinc-100 py-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      {d.toLocaleString('default', { month: 'short' })}
                    </div>
                    <div className="text-2xl font-black text-zinc-900">{d.getDate()}</div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="font-black text-zinc-900 uppercase tracking-tight">
                        {entry.actionType}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${style.bg} ${style.text}`}>
                        {entry.status === 'pending' && <Clock size={8} />}
                        {entry.status === 'completed' && <CheckCircle2 size={8} />}
                        {entry.status === 'missed' && <AlertCircle size={8} />}
                        {style.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <User size={9} /> {(entry as any).caregiverName || 'Caregiver'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flag size={9} /> {entry.patientName}
                      </span>
                      {entry.timeSlot && (
                        <span className="flex items-center gap-1">
                          <Clock size={9} /> {entry.timeSlot}
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="mt-1.5 text-[10px] text-zinc-400 font-mono">{entry.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(entry._id)}
                    disabled={deleteMutation.isPending}
                    className="flex-shrink-0 p-2 border-2 border-red-100 text-red-400 hover:bg-red-50 hover:border-red-300 transition-all"
                    title="Remove entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.25)] w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="bg-zinc-900 px-8 py-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                  TEMPORAL ASSIGNMENT
                </p>
                <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                  Assign Recording Task
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreate} className="p-8 space-y-5">
              {/* Patient */}
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPatientId}
                  onChange={e => {
                    setSelectedPatientId(e.target.value);
                    setSelectedCaregiver(null);
                  }}
                  required
                  className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none font-bold uppercase"
                >
                  <option value="">SELECT PATIENT...</option>
                  {patientsLoading
                    ? <option disabled>Loading...</option>
                    : actualPatients.map((p: any) => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.fullName} {p.mrn ? `(${p.mrn})` : ''}
                        </option>
                      ))}
                </select>
              </div>

              {/* Caregiver */}
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Caregiver <span className="text-red-500">*</span>
                </label>
                {invLoading ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold uppercase tracking-widest py-3">
                    <Loader2 size={12} className="animate-spin" /> Loading caregivers...
                  </div>
                ) : caregiversForPatient.length === 0 ? (
                  <div className="px-4 py-3 bg-amber-50 border-2 border-amber-200 text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                    {selectedPatientId
                      ? 'No accepted caregivers for this patient'
                      : 'Select a patient first'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {caregiversForPatient.map((inv: any) => (
                      <label
                        key={inv.id}
                        className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
                          selectedCaregiver?.id === inv.caregiverUserId
                            ? 'border-zinc-900 bg-zinc-50'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="caregiver"
                          value={inv.caregiverUserId}
                          checked={selectedCaregiver?.id === inv.caregiverUserId}
                          onChange={() =>
                            setSelectedCaregiver({
                              id: inv.caregiverUserId,
                              name: inv.caregiverName || inv.caregiverEmail,
                              email: inv.caregiverEmail,
                            })
                          }
                          className="accent-zinc-900"
                        />
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight text-zinc-900">
                            {inv.caregiverName || inv.caregiverEmail}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">{inv.caregiverEmail}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Action Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionType}
                  onChange={e => setActionType(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none font-bold uppercase"
                >
                  <option value="">SELECT ACTION...</option>
                  {ACTION_TYPES.map(a => (
                    <option key={a} value={a}>{a.toUpperCase()}</option>
                  ))}
                </select>
                {actionType === 'Other' && (
                  <input
                    type="text"
                    value={customAction}
                    onChange={e => setCustomAction(e.target.value)}
                    placeholder="DESCRIBE THE ACTION..."
                    required
                    className="mt-2 w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none font-bold uppercase placeholder:text-zinc-300"
                  />
                )}
              </div>

              {/* Date + Time (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    value={timeSlot}
                    onChange={e => setTimeSlot(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none font-bold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Instructions / Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Record from a left-side angle..."
                  className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none font-mono placeholder:text-zinc-300 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-2 border-t border-zinc-100">
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
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  ASSIGN TASK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
