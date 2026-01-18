import React, { useState, useEffect } from 'react';
import { usePatients, useUpdatePatient, useDeletePatient } from '../../../api/patient';
import { Search, Plus, Filter, MoreHorizontal, Loader2, Users, Eye, UserPlus, Edit, Archive, X, Mail, Phone, MapPin, Calendar, Activity, User, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Screen } from '../../../types';
import toast from 'react-hot-toast';

interface PatientListScreenProps {
  onNavigate?: (screen: Screen) => void;
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
    // Navigate to caregiver invitations and store patient ID for pre-selection
    localStorage.setItem('selectedPatientId', patient._id || patient.id);
    onNavigate?.(Screen.CAREGIVER_INVITATIONS);
  };

  const handleEditPatient = (patient: any) => {
    setOpenDropdown(null);
    // Store patient data for editing
    localStorage.setItem('editPatientData', JSON.stringify(patient));
    onNavigate?.(Screen.PATIENT_CREATE); // Reuse AddPatientScreen for editing
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
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-mono">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage all active patient profiles. ({total} total)</p>
        </div>
        <button
          onClick={() => onNavigate?.(Screen.PATIENT_CREATE)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 border border-zinc-800 rounded-none text-sm font-medium hover:bg-zinc-800 transition-colors uppercase tracking-wider"
        >
          <Plus size={16} /> Add Patient
        </button>
      </div>

      <div className="bg-white border-2 border-zinc-200">
        <div className="p-4 border-b border-zinc-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="SEARCH PATIENTS..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-none focus:ring-0 focus:border-zinc-900 outline-none transition-all uppercase tracking-tight"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-zinc-200 rounded-none text-zinc-600 text-xs font-bold uppercase tracking-widest bg-white"
          >
            <option value="all">ALL STATUS</option>
            <option value="Active">ACTIVE</option>
            <option value="Inactive">INACTIVE</option>
            <option value="Discharged">DISCHARGED</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Loading patients...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-500 mb-2">Failed to load patients</p>
              <p className="text-slate-500 text-sm">Please try refreshing the page</p>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No patients found</h3>
              <p className="text-slate-500 text-sm mb-4">
                {debouncedSearch ? 'Try adjusting your search' : 'Add your first patient to get started'}
              </p>
              {!debouncedSearch && (
                <button
                  onClick={() => onNavigate?.(Screen.PATIENT_CREATE)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  <Plus size={16} /> Add Patient
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left uppercase tracking-tight">
              <thead className="bg-zinc-900 text-zinc-400 font-bold border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3">Patient Name</th>
                  <th className="px-6 py-3">MRN</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Caregiver</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient: any) => (
                  <tr key={patient._id || patient.id} className="hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0">
                    <td className="px-6 py-4 font-bold text-zinc-900">{patient.fullName}</td>
                    <td className="px-6 py-4 text-zinc-500">{patient.mrn || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 border text-[10px] font-bold ${patient.status === 'Active' || patient.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : patient.status === 'Inactive'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                        {patient.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">{patient.asdSeverity || 'N/A'}</td>
                    <td className="px-6 py-4 text-zinc-600">{patient.caregiverName || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === (patient._id || patient.id) ? null : (patient._id || patient.id))}
                          className="text-zinc-400 hover:text-zinc-900 p-2 border border-transparent hover:border-zinc-200"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openDropdown === (patient._id || patient.id) && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-0 z-50">
                            <button
                              onClick={() => handleViewPatient(patient)}
                              className="w-full text-left px-4 py-2.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white flex items-center gap-2 border-b border-zinc-100 last:border-0 transition-colors"
                            >
                              <Eye size={14} />
                              VIEW DETAILS
                            </button>
                            <button
                              onClick={() => handleInviteCaregiver(patient)}
                              className="w-full text-left px-4 py-2.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white flex items-center gap-2 border-b border-zinc-100 last:border-0 transition-colors"
                            >
                              <UserPlus size={14} />
                              INVITE CAREGIVER
                            </button>
                            <button
                              onClick={() => handleEditPatient(patient)}
                              className="w-full text-left px-4 py-2.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white flex items-center gap-2 border-b border-zinc-100 last:border-0 transition-colors"
                            >
                              <Edit size={14} />
                              EDIT PATIENT
                            </button>
                            <button
                              onClick={() => handleArchivePatient(patient)}
                              disabled={deletePatientMutation.isPending}
                              className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                              <Archive size={14} />
                              ARCHIVE PATIENT
                            </button>
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

      {/* View Patient Modal */}
      {showViewModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-white border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-zinc-900 px-8 py-6 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-800 border border-zinc-700">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">{selectedPatient.fullName}</h2>
                  <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest mt-1">MRN: {selectedPatient.mrn}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-zinc-500 hover:text-white p-2 border border-transparent hover:border-zinc-800 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              {/* Basic Information */}
              <div className="mb-10">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <User size={14} />
                  01 / BASIC INFORMATION
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="FULL NAME" value={selectedPatient.fullName} />
                  <InfoField label="MRN" value={selectedPatient.mrn || 'N/A'} />
                  <InfoField label="DATE OF BIRTH" value={selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : 'N/A'} />
                  <InfoField label="GENDER" value={selectedPatient.gender || 'N/A'} />
                  <InfoField label="STATUS" value={selectedPatient.status || 'Active'} />
                  <InfoField label="ASD SEVERITY" value={selectedPatient.asdSeverity || 'N/A'} />
                  <InfoField label="LANGUAGE" value={selectedPatient.preferredLanguage || 'English'} />
                  <InfoField label="CAREGIVER" value={selectedPatient.caregiverName || 'Not assigned'} />
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-10">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <Phone size={14} />
                  02 / CONTACT DETAILS
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <InfoField label="EMAIL" value={selectedPatient.email || 'NOT PROVIDED'} />
                  <InfoField label="PHONE" value={selectedPatient.phone || 'NOT PROVIDED'} />
                  {selectedPatient.address && (
                    <div className="col-span-2">
                      <InfoField
                        label="RESIDENTIAL ADDRESS"
                        value={[
                          selectedPatient.address.street,
                          selectedPatient.address.city,
                          selectedPatient.address.state,
                          selectedPatient.address.zipCode,
                          selectedPatient.address.country
                        ].filter(Boolean).join(', ') || 'NOT PROVIDED'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              {selectedPatient.emergencyContact?.name && (
                <div className="mb-10">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-red-50 pb-2">
                    <Shield size={14} />
                    03 / EMERGENCY CONTACT
                  </h3>
                  <div className="p-6 border-2 border-red-100 bg-red-50/30">
                    <div className="grid grid-cols-2 gap-6">
                      <InfoField label="NAME" value={selectedPatient.emergencyContact.name} />
                      <InfoField label="RELATIONSHIP" value={selectedPatient.emergencyContact.relationship || 'N/A'} />
                      <InfoField label="PRIMARY PHONE" value={selectedPatient.emergencyContact.phone || 'N/A'} />
                      <InfoField label="ALTERNATE PHONE" value={selectedPatient.emergencyContact.alternatePhone || 'N/A'} />
                      {selectedPatient.emergencyContact.email && (
                        <div className="col-span-2">
                          <InfoField label="EMAIL" value={selectedPatient.emergencyContact.email} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Information */}
              <div className="mb-10">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <Activity size={14} />
                  04 / CLINICAL & DIAGNOSIS
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <InfoField
                      label="DIAGNOSIS DATE"
                      value={selectedPatient.diagnosisDate ? new Date(selectedPatient.diagnosisDate).toLocaleDateString() : 'NOT PROVIDED'}
                    />
                    <InfoField label="PRIMARY PHYSICIAN" value={selectedPatient.primaryPhysician || 'NOT PROVIDED'} />
                  </div>

                  {selectedPatient.diagnosisDetails && (
                    <div className="border border-zinc-200 p-4 bg-zinc-50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">DIAGNOSIS DETAILS</p>
                      <p className="text-sm text-zinc-800 leading-relaxed font-mono">{selectedPatient.diagnosisDetails}</p>
                    </div>
                  )}

                  {selectedPatient.specialNeeds && (
                    <div className="border border-zinc-200 p-4 bg-zinc-50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">SPECIAL NEEDS</p>
                      <p className="text-sm text-zinc-800 leading-relaxed font-mono">{selectedPatient.specialNeeds}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Arrays */}
              {(selectedPatient.coOccurringConditions?.length > 0 ||
                selectedPatient.allergies?.length > 0 ||
                selectedPatient.currentMedications?.length > 0 ||
                selectedPatient.previousTherapies?.length > 0) && (
                  <div className="mb-10">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <Calendar size={14} />
                      05 / CLINICAL ARRAYS
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                      {selectedPatient.coOccurringConditions?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">CO-OCCURRING CONDITIONS</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPatient.coOccurringConditions.map((condition: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase">
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPatient.allergies?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3">ALLERGIES</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPatient.allergies.map((allergy: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase">
                                {allergy}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPatient.currentMedications?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">CURRENT MEDICATIONS</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPatient.currentMedications.map((med: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase">
                                {med}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPatient.previousTherapies?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">PREVIOUS THERAPIES</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPatient.previousTherapies.map((therapy: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase">
                                {therapy}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            {/* Footer - Sticky */}
            <div className="bg-zinc-50 px-8 py-5 flex items-center justify-end gap-3 border-t border-zinc-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditPatient(selectedPatient);
                }}
                className="px-6 py-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-none text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                <Edit size={14} />
                EDIT PROFILE
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2.5 border border-zinc-300 text-zinc-900 rounded-none text-xs font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component for Info Fields
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-zinc-100 pl-4 py-1">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-zinc-900 font-mono tracking-tight">{value}</p>
    </div>
  );
}
