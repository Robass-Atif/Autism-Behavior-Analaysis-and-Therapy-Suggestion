import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Plus, Save, UserPlus, Check, ChevronDown } from 'lucide-react';
import { useCreatePatient, useUpdatePatient, CreatePatientData, UpdatePatientData } from '../../../api/patient';
import { useCreateInvitation } from '../../../api/invitation';
import toast from 'react-hot-toast';

interface AddPatientScreenProps {
    onBack: () => void;
    onSuccess?: () => void;
}

const ASD_LEVELS = [
    { value: 'Level 1', label: 'Level 1', desc: 'Requiring Support' },
    { value: 'Level 2', label: 'Level 2', desc: 'Requiring Substantial Support' },
    { value: 'Level 3', label: 'Level 3', desc: 'Requiring Very Substantial Support' },
];

const RELATIONSHIPS = ['Parent', 'Guardian', 'Grandparent', 'Sibling', 'Other'];

export default function AddPatientScreen({ onBack, onSuccess }: AddPatientScreenProps) {
    const createPatientMutation = useCreatePatient();
    const updatePatientMutation = useUpdatePatient();
    const createInvitationMutation = useCreateInvitation();

    const [isEditMode, setIsEditMode] = useState(false);
    const [editPatientId, setEditPatientId] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [inviteCaregiver, setInviteCaregiver] = useState(false);

    // Form state - simplified and grouped logically
    const [form, setForm] = useState({
        // Patient Info
        fullName: '',
        dob: '',
        gender: 'male',
        mrn: '',

        // Diagnosis
        asdSeverity: '',
        diagnosisDate: '',
        primaryPhysician: '',
        diagnosisDetails: '',

        // Guardian (Primary Contact)
        guardianName: '',
        guardianRelationship: '',
        guardianPhone: '',
        guardianEmail: '',

        // Caregiver Invitation (optional)
        caregiverName: '',
        caregiverEmail: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load edit data
    useEffect(() => {
        const editData = localStorage.getItem('editPatientData');
        if (editData) {
            try {
                const patient = JSON.parse(editData);
                setIsEditMode(true);
                setEditPatientId(patient._id || patient.id);
                setForm(prev => ({
                    ...prev,
                    fullName: patient.fullName || '',
                    dob: patient.dob?.split('T')[0] || '',
                    gender: patient.gender || 'male',
                    mrn: patient.mrn || '',
                    asdSeverity: patient.asdSeverity || '',
                    diagnosisDate: patient.diagnosisDate?.split('T')[0] || '',
                    primaryPhysician: patient.primaryPhysician || '',
                    diagnosisDetails: patient.diagnosisDetails || '',
                    guardianName: patient.emergencyContact?.name || '',
                    guardianRelationship: patient.emergencyContact?.relationship || '',
                    guardianPhone: patient.emergencyContact?.phone || '',
                    guardianEmail: patient.emergencyContact?.email || '',
                }));
                localStorage.removeItem('editPatientData');
            } catch (e) {
                console.error('Failed to load patient data:', e);
            }
        }
    }, []);

    // Generate MRN
    const generateMRN = () => {
        const ts = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        setForm(prev => ({ ...prev, mrn: `MRN-${ts}-${rand}` }));
    };

    // Auto-generate MRN on mount for new patients
    useEffect(() => {
        if (!isEditMode && !form.mrn) {
            generateMRN();
        }
    }, [isEditMode]);

    const updateField = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Calculate progress based on filled required fields
    const getProgress = () => {
        const required = ['fullName', 'dob', 'gender', 'mrn', 'guardianName', 'guardianPhone'];
        const filled = required.filter(f => form[f as keyof typeof form]?.trim()).length;
        return Math.round((filled / required.length) * 100);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.fullName.trim()) newErrors.fullName = 'Name is required';
        if (!form.dob) newErrors.dob = 'Date of birth is required';
        if (!form.mrn.trim()) newErrors.mrn = 'MRN is required';
        if (!form.guardianName.trim()) newErrors.guardianName = 'Guardian name is required';
        if (!form.guardianPhone.trim()) newErrors.guardianPhone = 'Guardian phone is required';

        if (inviteCaregiver) {
            if (!form.caregiverName.trim()) newErrors.caregiverName = 'Caregiver name is required';
            if (!form.caregiverEmail.trim()) newErrors.caregiverEmail = 'Caregiver email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.caregiverEmail)) {
                newErrors.caregiverEmail = 'Invalid email format';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const patientData: CreatePatientData = {
                mrn: form.mrn,
                fullName: form.fullName,
                dob: form.dob,
                gender: form.gender,
                asdSeverity: form.asdSeverity || undefined,
                diagnosisDate: form.diagnosisDate || undefined,
                primaryPhysician: form.primaryPhysician || undefined,
                diagnosisDetails: form.diagnosisDetails || undefined,
                emergencyContact: {
                    name: form.guardianName,
                    relationship: form.guardianRelationship || 'Guardian',
                    phone: form.guardianPhone,
                    email: form.guardianEmail || undefined,
                },
            };

            let createdPatient: any;

            if (isEditMode && editPatientId) {
                await updatePatientMutation.mutateAsync({
                    id: editPatientId,
                    data: patientData as UpdatePatientData
                });
                toast.success('Patient updated successfully');
            } else {
                createdPatient = await createPatientMutation.mutateAsync(patientData);
                toast.success('Patient created successfully');

                // Send caregiver invitation if requested
                if (inviteCaregiver && form.caregiverName && form.caregiverEmail) {
                    try {
                        const patientId = createdPatient.patient?._id || createdPatient.patient?.id || createdPatient._id || createdPatient.id;
                        await createInvitationMutation.mutateAsync({
                            patientId,
                            caregiverName: form.caregiverName,
                            caregiverEmail: form.caregiverEmail,
                            expiresInDays: 7,
                        });
                        toast.success(`Invitation sent to ${form.caregiverEmail}`);
                    } catch (inviteError) {
                        console.error('Invitation error:', inviteError);
                        toast.error('Patient created, but invitation failed to send');
                    }
                }
            }

            onSuccess?.();
            onBack();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Failed to save patient';
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
    };

    const progress = getProgress();
    const isLoading = createPatientMutation.isPending || updatePatientMutation.isPending;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-xs text-slate-500">Progress</span>
                                <div className="text-sm font-semibold text-slate-900">{progress}%</div>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-900 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {isEditMode ? 'Edit Patient' : 'Add New Patient'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isEditMode ? 'Update patient information' : 'Enter patient and guardian details'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Patient Information */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                            Patient Information
                        </h2>

                        <div className="grid grid-cols-1 gap-4">
                            <InputField
                                label="Full Name"
                                value={form.fullName}
                                onChange={(v) => updateField('fullName', v)}
                                placeholder="Enter patient's full name"
                                error={errors.fullName}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    label="Date of Birth"
                                    type="date"
                                    value={form.dob}
                                    onChange={(v) => updateField('dob', v)}
                                    error={errors.dob}
                                    required
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        {['male', 'female', 'other'].map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => updateField('gender', g)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all capitalize ${form.gender === g
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <InputField
                                label="Medical Record Number"
                                value={form.mrn}
                                onChange={(v) => updateField('mrn', v)}
                                placeholder="MRN-XXXXX"
                                error={errors.mrn}
                                required
                                disabled
                            />
                        </div>
                    </section>

                    {/* Section 2: Diagnosis */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                            Diagnosis
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ASD Severity Level
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {ASD_LEVELS.map((level) => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => updateField('asdSeverity', level.value)}
                                        className={`p-3 rounded-lg border text-left transition-all ${form.asdSeverity === level.value
                                                ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="text-sm font-medium text-slate-900">{level.label}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{level.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Diagnosis Fields */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                        >
                            <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                            {showAdvanced ? 'Hide' : 'Show'} additional details
                        </button>

                        {showAdvanced && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <InputField
                                    label="Diagnosis Date"
                                    type="date"
                                    value={form.diagnosisDate}
                                    onChange={(v) => updateField('diagnosisDate', v)}
                                />
                                <InputField
                                    label="Primary Physician"
                                    value={form.primaryPhysician}
                                    onChange={(v) => updateField('primaryPhysician', v)}
                                    placeholder="Dr. Smith"
                                />
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Additional Notes
                                    </label>
                                    <textarea
                                        value={form.diagnosisDetails}
                                        onChange={(e) => updateField('diagnosisDetails', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                                        placeholder="Any additional diagnosis information..."
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Section 3: Guardian Information */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                            Guardian / Primary Contact
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Guardian Name"
                                value={form.guardianName}
                                onChange={(v) => updateField('guardianName', v)}
                                placeholder="Full name"
                                error={errors.guardianName}
                                required
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Relationship
                                </label>
                                <select
                                    value={form.guardianRelationship}
                                    onChange={(e) => updateField('guardianRelationship', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                >
                                    <option value="">Select...</option>
                                    {RELATIONSHIPS.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <InputField
                                label="Phone Number"
                                type="tel"
                                value={form.guardianPhone}
                                onChange={(v) => updateField('guardianPhone', v)}
                                placeholder="+1 (555) 123-4567"
                                error={errors.guardianPhone}
                                required
                            />
                            <InputField
                                label="Email"
                                type="email"
                                value={form.guardianEmail}
                                onChange={(v) => updateField('guardianEmail', v)}
                                placeholder="email@example.com"
                            />
                        </div>
                    </section>

                    {/* Section 4: Caregiver Invitation (Optional) */}
                    {!isEditMode && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                        Invite Caregiver
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Send an invitation to join the platform</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInviteCaregiver(!inviteCaregiver)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${inviteCaregiver ? 'bg-slate-900' : 'bg-slate-200'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${inviteCaregiver ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>

                            {inviteCaregiver && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <InputField
                                        label="Caregiver Name"
                                        value={form.caregiverName}
                                        onChange={(v) => updateField('caregiverName', v)}
                                        placeholder="Full name"
                                        error={errors.caregiverName}
                                        required
                                    />
                                    <InputField
                                        label="Caregiver Email"
                                        type="email"
                                        value={form.caregiverEmail}
                                        onChange={(v) => updateField('caregiverEmail', v)}
                                        placeholder="email@example.com"
                                        error={errors.caregiverEmail}
                                        required
                                    />
                                    <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                                        <UserPlus size={14} />
                                        <span>An invitation email will be sent after patient is created</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isEditMode ? (
                                <Save className="w-4 h-4" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            {isEditMode ? 'Update Patient' : 'Create Patient'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Reusable Input Component
function InputField({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    error,
    required,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    } ${disabled ? 'bg-slate-100 text-slate-500' : ''}`}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
