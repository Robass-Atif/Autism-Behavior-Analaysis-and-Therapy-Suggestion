import React, { useState, useEffect } from 'react';
import { usePatients, useUpdatePatient, useDeletePatient } from '../../../api/patient';
import { Search, Plus, Filter, MoreHorizontal, Loader2, Users, Eye, UserPlus, Edit, Archive, X, Mail, Phone, MapPin, Calendar, Activity, User, Shield, ChevronLeft, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';
import { Screen } from '../../../types';
import toast from '../../../lib/toast';

interface PatientListScreenProps {
  onNavigate?: (screen: Screen, data?: any) => void;
}

export default function PatientListScreen({ onNavigate }: PatientListScreenProps) {

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Use backend filtering
  const { data, isLoading, error } = usePatients({
    search: debouncedSearch,
    status: statusFilter,
    page,
    limit: 20,
  });
  const updatePatientMutation = useUpdatePatient();
  const deletePatientMutation = useDeletePatient();

  // Extract data from response
  const patients = data?.patients || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.relative.inline-block')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleViewPatient = (patient: any) => {
    setOpenDropdown(null);
    setSelectedPatient(patient);
    setShowViewModal(true);
  };

  const handleInviteCaregiver = (patient: any) => {
    setOpenDropdown(null);
    localStorage.setItem('selectedPatientId', patient._id || patient.id);
    onNavigate?.(Screen.CAREGIVER_INVITATIONS);
  };

  const handleEditPatient = (patient: any) => {
    setOpenDropdown(null);
    localStorage.setItem('editPatientData', JSON.stringify(patient));
    onNavigate?.(Screen.PATIENT_CREATE);
  };

  const handleArchivePatient = async (patient: any) => {
    setOpenDropdown(null);
    const confirmed = confirm(`Are you sure you want to archive ${patient.fullName}? This will soft delete the patient.`);

    if (confirmed) {
      try {
        await deletePatientMutation.mutateAsync(patient._id || patient.id);
        toast.success(`${patient.fullName} has been archived`);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to archive patient';
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-mono">
      {/* Header - Industrial/Brutal style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-zinc-900 p-8 border-b-4 border-zinc-800 text-white">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Clinical Roster <span className="text-zinc-500">{total}</span></h1>
          <p className="text-zinc-400 text-[10px] mt-1 font-bold uppercase tracking-[0.2em]">Active Patient Identification & Management Console</p>
        </div>
        <button
          onClick={() => onNavigate?.(Screen.PATIENT_CREATE)}
          className="flex items-center gap-2 bg-white text-zinc-900 px-6 py-3 border-2 border-white font-black text-xs uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Plus size={16} strokeWidth={3} /> Add Patient
        </button>
      </div>

      <div className="bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b-2 border-zinc-100 flex flex-col md:flex-row gap-4 bg-zinc-50/50">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="SEARCH BY IDENTITY / MRN / DIAGNOSIS..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border-2 border-zinc-200 focus:border-zinc-900 outline-none transition-all font-bold uppercase tracking-tight"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border-2 border-zinc-200 text-zinc-600 text-[10px] font-black uppercase tracking-widest bg-white focus:border-zinc-900 outline-none appearance-none cursor-pointer pr-10 relative"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2318181b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
          >
            <option value="all">ANY STATUS</option>
            <option value="Active">STATUS ACTIVE</option>
            <option value="Inactive">STATUS INACTIVE</option>
            <option value="Discharged">STATUS DISCHARGED</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent animate-spin"></div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hydrating Clinical Data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-zinc-900 mb-4" />
            <h3 className="text-sm font-black text-zinc-900 uppercase">Input/Output Error</h3>
            <p className="text-zinc-500 text-[10px] mt-1 uppercase font-bold">Unable to reach patient registry.</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-zinc-200 mb-4" />
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Registry Empty</h3>
            <p className="text-zinc-500 text-[10px] mt-2 max-w-xs mx-auto font-bold uppercase tracking-widest">
              {debouncedSearch ? "Filter returned zero matches." : "No patients linked to this account."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900 border-b-2 border-zinc-900 text-zinc-400">
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]">Patient Name</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]">MRN</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]">Baseline</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]">Caregiver</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-zinc-100">
                {patients.map((patient: any) => (
                  <tr key={patient._id || patient.id} className="hover:bg-zinc-50 transition-colors group border-b border-zinc-100 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center text-xs font-black group-hover:bg-zinc-900 group-hover:text-white transition-all">
                          {patient.fullName.charAt(0)}
                        </div>
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">{patient.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-400 tracking-tighter">{patient.mrn || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 border-2 text-[9px] font-black uppercase tracking-widest ${patient.status === 'Active' || patient.status === 'active'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-400 border-zinc-200'
                        }`}>
                        {patient.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-zinc-600 uppercase tracking-widest">{patient.asdSeverity || '—'}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{patient.caregiverName || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === (patient._id || patient.id) ? null : (patient._id || patient.id))}
                          className="text-zinc-400 hover:text-zinc-900 p-2 border-2 border-transparent hover:border-zinc-900 transition-all"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openDropdown === (patient._id || patient.id) && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] py-0 z-50">
                            <DropdownItem icon={<Eye size={12} />} label="VIEW DETAILS" onClick={() => handleViewPatient(patient)} />
                            <DropdownItem icon={<TrendingUp size={12} />} label="VIEW TRENDS" onClick={() => onNavigate?.(Screen.PATIENT_LONGITUDINAL, { patientId: patient._id || patient.id })} />
                            <DropdownItem icon={<UserPlus size={12} />} label="INVITE CAREGIVER" onClick={() => handleInviteCaregiver(patient)} />
                            <DropdownItem icon={<Edit size={12} />} label="EDIT PROFILE" onClick={() => handleEditPatient(patient)} />
                            <div className="h-0.5 bg-zinc-100"></div>
                            <DropdownItem icon={<Archive size={12} />} label="ARCHIVE" color="text-red-600" onClick={() => handleArchivePatient(patient)} disabled={deletePatientMutation.isPending} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination View */}
      <div className="flex items-center justify-between px-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-2 border-2 border-zinc-200 bg-white hover:border-zinc-900 disabled:opacity-30 transition-all overflow-hidden"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 border-2 border-zinc-200 bg-white hover:border-zinc-900 disabled:opacity-30 transition-all overflow-hidden"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* View Patient Modal */}
      {showViewModal && selectedPatient && (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-mono" onClick={() => setShowViewModal(false)}>
          <div className="bg-white border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-zinc-900 px-8 py-6 flex items-center justify-between border-b-4 border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white text-zinc-900 border-2 border-white flex items-center justify-center text-xl font-black">
                  {selectedPatient.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-1">{selectedPatient.fullName}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-none">ID: {selectedPatient.mrn}</span>
                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">• {selectedPatient.status}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="w-10 h-10 border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-all flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-white space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-10">
                  <section>
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 border-b-2 border-zinc-50 pb-2">
                      <User size={14} /> Profile Identity
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <InfoField label="DOB" value={selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : 'N/A'} />
                      <InfoField label="GENDER" value={selectedPatient.gender || 'N/A'} />
                      <InfoField label="LANG" value={selectedPatient.preferredLanguage || 'English'} />
                      <InfoField label="ASD LEVEL" value={selectedPatient.asdSeverity || 'N/A'} />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 border-b-2 border-zinc-50 pb-2">
                      <Phone size={14} /> Contact Links
                    </h3>
                    <div className="space-y-4">
                      <InfoField label="EMAIL" value={selectedPatient.email || 'N/A'} />
                      <InfoField label="PHONE" value={selectedPatient.phone || 'N/A'} />
                    </div>
                  </section>
                </div>

                <div className="space-y-10">
                  <section className="bg-zinc-50 border-2 border-zinc-200 p-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <Activity size={14} /> Diagnosis Logs
                    </h3>
                    <div className="space-y-4 text-xs font-bold text-zinc-700 uppercase leading-relaxed">
                      {selectedPatient.diagnosisDetails ? (
                        <p className="bg-white border-2 border-zinc-100 p-4 leading-relaxed font-mono">"{selectedPatient.diagnosisDetails}"</p>
                      ) : <p className="text-zinc-300 italic">Historical data missing.</p>}

                      <div className="pt-4 border-t border-zinc-100">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">STAMP DATE</span>
                        <span className="text-xs font-black text-zinc-900">{selectedPatient.diagnosisDate ? new Date(selectedPatient.diagnosisDate).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                  </section>

                  <section className="bg-zinc-900 border-2 border-zinc-800 p-6 text-white">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <Shield size={14} /> Emergency Overrides
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.allergies?.length > 0 ? (
                        selectedPatient.allergies.map((a: string) => (
                          <span key={a} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-red-400 text-[10px] font-black uppercase">{a}</span>
                        ))
                      ) : <span className="text-[10px] font-bold text-zinc-600">No active alerts recorded.</span>}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50 px-8 py-5 border-t-4 border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <Shield size={14} /> System Secure Record
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setShowViewModal(false); handleEditPatient(selectedPatient); }}
                  className="px-6 py-2.5 bg-zinc-900 text-white border-2 border-zinc-900 font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-6 py-2.5 bg-white text-zinc-900 border-2 border-zinc-200 font-black text-xs uppercase tracking-widest hover:border-zinc-900 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, onClick, color = 'text-zinc-900', disabled = false }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-2.5 text-[10px] font-black flex items-center gap-3 hover:bg-zinc-900 hover:text-white transition-colors uppercase tracking-tight ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
      <p className="text-xs font-black text-zinc-900 tracking-tight uppercase">{value}</p>
    </div>
  );
}
