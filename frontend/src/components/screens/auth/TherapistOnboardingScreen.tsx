import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from '../../../lib/toast';
import { ArrowRight, CheckCircle2, Activity, MapPin, Clock, ShieldCheck, Briefcase, Loader2 } from 'lucide-react';
import { useCompleteOnboarding } from '../../../api/auth';

// Zod Schema for Onboarding
const onboardingSchema = z.object({
  clinicName: z.string().min(2, 'Clinic name is required'),
  clinicAddress: z.string().min(5, 'Clinic address is required'),
  specialties: z.array(z.string()).min(1, 'At least one specialty is required'),
  bio: z.string().optional(),
  workingHours: z.object({
    start: z.string().min(1, 'Start time is required'),
    end: z.string().min(1, 'End time is required'),
  }),
  consultationFee: z.string().optional(),
});

type OnboardingInputs = z.infer<typeof onboardingSchema>;

interface TherapistOnboardingScreenProps {
  onComplete: () => void;
}

const SPECIALTIES = [
  'Autism Spectrum Disorder (ASD)',
  'Applied Behavior Analysis (ABA)',
  'Speech-Language Therapy',
  'Occupational Therapy',
  'Early Intervention',
  'Social Skills Training',
  'Cognitive Behavioral Therapy',
  'Play Therapy',
  'Sensory Integration'
];

export default function TherapistOnboardingScreen({ onComplete }: TherapistOnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completeOnboardingMutation = useCompleteOnboarding();

  const { register, handleSubmit, formState: { errors }, getValues, watch } = useForm<OnboardingInputs>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      specialties: [],
      workingHours: {
        start: '09:00',
        end: '17:00'
      }
    },
  });

  const watchedValues = watch();

  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(prev => prev.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties(prev => [...prev, specialty]);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(step => step + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(step => step - 1);
    }
  };

  const handleSkip = () => {
    // Skip onboarding - still mark as complete to avoid asking again
    handleCompleteOnboarding(true);
  };

  const handleCompleteOnboarding = async (skipData = false) => {
    setIsSubmitting(true);

    try {
      const formData = skipData ? {
        clinicName: 'Not provided',
        clinicAddress: 'Not provided',
        specialties: ['General'],
        workingHours: { start: '09:00', end: '17:00' },
      } : {
        clinicName: watchedValues.clinicName || 'Not provided',
        clinicAddress: watchedValues.clinicAddress || 'Not provided',
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : ['General'],
        bio: watchedValues.bio,
        workingHours: {
          start: watchedValues.workingHours?.start || '09:00',
          end: watchedValues.workingHours?.end || '17:00'
        },
        consultationFee: watchedValues.consultationFee,
      };

      console.log('📋 Calling complete-onboarding API...');
      await completeOnboardingMutation.mutateAsync(formData);
      console.log('✅ API call successful');

      // Update localStorage to reflect onboarding completed
      try {
        const storedUser = localStorage.getItem('userRole');
        console.log('📋 Current localStorage userRole:', storedUser);

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.onboardingCompleted = true;
          localStorage.setItem('userRole', JSON.stringify(userData));
          console.log('✅ localStorage updated with onboardingCompleted: true');
          console.log('📋 New localStorage value:', localStorage.getItem('userRole'));
        }

        // Also update cookies
        const userDataCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user_data='))
          ?.split('=')[1];

        if (userDataCookie) {
          const userData = JSON.parse(decodeURIComponent(userDataCookie));
          userData.onboardingCompleted = true;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);
          document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
          console.log('✅ Cookie updated with onboardingCompleted: true');
        }
      } catch (e) {
        console.warn('❌ Failed to update storage:', e);
      }

      toast.success('Profile setup complete!');
      onComplete();
    } catch (error: any) {
      console.error('❌ Onboarding failed:', error);
      toast.error(error?.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: OnboardingInputs) => {
    await handleCompleteOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-3xl w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
              <p className="text-blue-100 mt-1 text-sm">Setup your clinic information and preferences</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="text-white/80 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-8 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${step < currentStep ? 'bg-blue-600 text-white' :
                    step === currentStep ? 'bg-blue-600 text-white' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                    {step < currentStep ? <CheckCircle2 size={14} /> : step}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${step === currentStep ? 'text-slate-900' : 'text-slate-500'
                    }`}>
                    {step === 1 && 'Clinic'}
                    {step === 2 && 'Specialties'}
                    {step === 3 && 'Review'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step < currentStep ? 'bg-blue-600' : 'bg-slate-200'
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Activity size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Clinic Information</h2>
                    <p className="text-slate-500 text-sm">Tell us about your practice</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Clinic Name *</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        {...register('clinicName')}
                        className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                        placeholder="e.g., NeuroCare Therapy Center"
                      />
                    </div>
                    {errors.clinicName && <p className="mt-2 text-xs text-red-600 font-medium">{errors.clinicName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Clinic Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <textarea
                        {...register('clinicAddress')}
                        rows={3}
                        className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all placeholder-slate-400 resize-none"
                        placeholder="Enter your full clinic address"
                      />
                    </div>
                    {errors.clinicAddress && <p className="mt-2 text-xs text-red-600 font-medium">{errors.clinicAddress.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">Working Hours - Start *</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          {...register('workingHours.start')}
                          type="time"
                          className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      {errors.workingHours?.start && <p className="mt-2 text-xs text-red-600 font-medium">{errors.workingHours.start.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">Working Hours - End *</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          {...register('workingHours.end')}
                          type="time"
                          className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      {errors.workingHours?.end && <p className="mt-2 text-xs text-red-600 font-medium">{errors.workingHours.end.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Consultation Fee (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-500 text-lg">$</span>
                      <input
                        {...register('consultationFee')}
                        type="text"
                        className="block w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all"
                        placeholder="150"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Enter your standard consultation fee per session</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Briefcase size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Specialties & Services</h2>
                    <p className="text-slate-500 text-sm">Select your areas of expertise</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-3">Specialties *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SPECIALTIES.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleSpecialty(specialty)}
                        className={`p-4 border-2 rounded-xl text-sm font-medium transition-all text-left ${selectedSpecialties.includes(specialty)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                  {errors.specialties && <p className="mt-2 text-xs text-red-600 font-medium">{errors.specialties.message}</p>}
                  <p className="mt-3 text-sm text-slate-500">
                    Selected: {selectedSpecialties.length} specialty{selectedSpecialties.length !== 1 ? 'ies' : ''}
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Review & Confirm</h2>
                    <p className="text-slate-500 text-sm">Review your information before submitting</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Clinic Name</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {watchedValues.clinicName || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Address</p>
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {watchedValues.clinicAddress || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Working Hours</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {watchedValues.workingHours?.start || '09:00'} - {watchedValues.workingHours?.end || '17:00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Consultation Fee</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {watchedValues.consultationFee ? `$${watchedValues.consultationFee}` : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs text-slate-500 mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpecialties.length > 0 ? selectedSpecialties.map((specialty) => (
                        <span key={specialty} className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                          {specialty}
                        </span>
                      )) : (
                        <span className="text-sm text-slate-500">No specialties selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  console.log('🔘 Button clicked, currentStep:', currentStep);
                  if (currentStep === 3) {
                    console.log('📋 Calling handleCompleteOnboarding...');
                    handleCompleteOnboarding(false);
                  } else {
                    nextStep();
                  }
                }}
                disabled={isSubmitting}
                className="flex items-center px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : currentStep === 3 ? (
                  <>
                    Complete Setup <ArrowRight size={18} className="ml-2" />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
