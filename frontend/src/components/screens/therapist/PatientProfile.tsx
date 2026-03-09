import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, ChevronDown, Save, X, User, Activity, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useCreatePatient } from '../../../api/patient';

// Validation Schema
const patientSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  dob: z.string().min(1, 'Date of birth is required').refine((date) => new Date(date) < new Date(), "Date of birth must be in the past"),
  gender: z.enum(['Male', 'Female']),
  mrn: z.string().min(1, 'Medical Record Number is required'),
  diagnosisDate: z.string(),
  asdSeverity: z.enum(['Level 1', 'Level 2', 'Level 3']),
  coOccurring: z.string().optional(), // Comma separated for simplicity in UI, parsed on submit
  medications: z.string().optional()
});

type PatientFormInputs = z.infer<typeof patientSchema>;

export default function PatientProfile() {
  const inputClasses = "block w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 disabled:bg-slate-50";
  const errorClasses = "border-red-300 focus:border-red-500 focus:ring-red-200";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PatientFormInputs>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'Male',
      asdSeverity: 'Level 1'
    }
  });

  const createPatientMutation = useCreatePatient();

  const onSubmit = (data: PatientFormInputs) => {
    createPatientMutation.mutate({
      ...data,
      mrn: `MRN-${data.mrn}`,
      coOccurringConditions: data.coOccurring ? data.coOccurring.split(',').map(s => s.trim()) : [],
      caregiverId: 'cg-temp', // Assigned in separate flow
      caregiverName: 'Unassigned'
    }, {
      onSuccess: () => {
        alert("Patient created successfully!");
        reset();
      }
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Patient Profile</h1>
           <p className="text-sm text-slate-500">Create a new clinical record.</p>
        </div>
        <div className="ml-auto flex gap-3">
          <button type="button" onClick={() => reset()} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Reset
          </button>
          <button 
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || createPatientMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {createPatientMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Record
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Personal Information</h2>
            <User size={16} className="text-slate-400" />
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label required>Full Name</Label>
              <input 
                type="text" 
                {...register('fullName')}
                className={`${inputClasses} ${errors.fullName ? errorClasses : ''}`} 
                placeholder="e.g. John Doe" 
              />
              {errors.fullName && <ErrorMessage>{errors.fullName.message}</ErrorMessage>}
            </div>
            
            <div>
              <Label required>Date of Birth</Label>
              <div className="relative">
                <input 
                  type="date" 
                  {...register('dob')}
                  className={`${inputClasses} pr-10 ${errors.dob ? errorClasses : ''}`} 
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.dob && <ErrorMessage>{errors.dob.message}</ErrorMessage>}
            </div>

            <div>
              <Label>Gender</Label>
              <div className="relative">
                <select {...register('gender')} className={`${inputClasses} appearance-none`}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-2">
               <Label required>Medical Record Number (MRN)</Label>
               <div className="flex">
                 <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm font-medium">
                   MRN-
                 </span>
                 <input 
                    type="text" 
                    {...register('mrn')}
                    className={`${inputClasses} rounded-l-none ${errors.mrn ? errorClasses : ''}`} 
                    placeholder="2023-0000" 
                  />
               </div>
               {errors.mrn && <ErrorMessage>{errors.mrn.message}</ErrorMessage>}
            </div>
          </div>
        </section>

        {/* Clinical Information */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Clinical Details</h2>
            <Activity size={16} className="text-slate-400" />
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Diagnosis Date</Label>
              <input 
                type="date" 
                {...register('diagnosisDate')}
                className={inputClasses} 
              />
            </div>

            <div>
              <Label>ASD Severity Level</Label>
              <div className="relative">
                <select {...register('asdSeverity')} className={`${inputClasses} appearance-none`}>
                  <option value="Level 1">Level 1 (Requiring Support)</option>
                  <option value="Level 2">Level 2 (Substantial Support)</option>
                  <option value="Level 3">Level 3 (Very Substantial Support)</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Co-occurring Conditions</Label>
              <input 
                type="text" 
                {...register('coOccurring')}
                className={inputClasses}
                placeholder="Separate with commas (e.g. ADHD, Anxiety)"
              />
              <p className="mt-1 text-xs text-slate-500">List all diagnosed comorbidities.</p>
            </div>

            <div className="md:col-span-2">
              <Label>Current Medications</Label>
              <textarea 
                rows={3} 
                {...register('medications')}
                className={`${inputClasses} resize-y`} 
                placeholder="List active medications and dosages..."
              ></textarea>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

const Label = ({ children, required }: { children?: React.ReactNode, required?: boolean }) => (
  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

const ErrorMessage = ({ children }: { children?: React.ReactNode }) => (
  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
    <AlertCircle size={10} /> {children}
  </p>
);
