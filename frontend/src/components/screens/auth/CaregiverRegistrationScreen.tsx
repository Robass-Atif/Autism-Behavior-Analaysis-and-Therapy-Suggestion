import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CaregiverRegistrationData } from '../../../types';
import { X, Mail, Phone, User, Lock, CheckCircle2, AlertCircle, Calendar, Users, Bell, Video, Eye, EyeOff } from 'lucide-react';

// Zod Schema for Caregiver Registration
const caregiverRegistrationSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  preferredLanguage: z.string().min(1, 'Preferred language is required'),
  dateOfBirth: z.string().optional(),

  // Relationship
  relationshipType: z.string().min(1, 'Relationship type is required'),
  invitationCode: z.string().min(6, 'Invitation code is required'),

  // Security
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),

  // Compliance
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to Terms of Service'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must agree to Privacy Policy'),

  // Emergency Contact
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),

  // Notifications
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(true),
  sessionReminders: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CaregiverFormInputs = z.infer<typeof caregiverRegistrationSchema>;

interface CaregiverRegistrationScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

const LANGUAGES = [
  'English',
  'Spanish',
  'Mandarin',
  'Arabic',
  'French',
  'German',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Hindi',
  'Other'
];

const RELATIONSHIP_TYPES = [
  'Parent',
  'Legal Guardian',
  'Grandparent',
  'Sibling',
  'Extended Family Member',
  'Professional Caregiver',
  'Other'
];

export default function CaregiverRegistrationScreen({ onBack, onSuccess }: CaregiverRegistrationScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationVerified, setInvitationVerified] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, trigger, setValue } = useForm<CaregiverFormInputs>({
    resolver: zodResolver(caregiverRegistrationSchema),
    defaultValues: {
      preferredLanguage: 'English',
      relationshipType: '',
      emailNotifications: true,
      smsNotifications: true,
      sessionReminders: true,
    },
  });

  const watchedPassword = watch('password');
  const watchedInvitationCode = watch('invitationCode');

  const verifyInvitation = async () => {
    // This will be connected to API later
    if (watchedInvitationCode?.length >= 6) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInvitationVerified(true);
    }
  };

  const onSubmit = async (data: CaregiverFormInputs) => {
    // This will be connected to API later
    console.log('Caregiver Registration Data:', data);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Redirect to login with success message
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6">
          <button onClick={onBack} className="text-white/80 hover:text-white flex items-center gap-2 text-sm mb-4 transition-colors">
            <X size={18} /> Back to Login
          </button>
          <h1 className="text-2xl font-bold text-white">Caregiver Registration</h1>
          <p className="text-emerald-100 mt-1 text-sm">Join as a caregiver to support patient therapy</p>
        </div>

        {/* Invitation Notice */}
        <div className="bg-amber-50 border border-amber-200 px-8 py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 mb-1">Caregiver Registration by Invitation Only</p>
            <p className="text-amber-700">You must have a valid invitation code from a therapist or admin to register.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8">
          <div className="space-y-8">
            {/* Personal Information Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <User size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
                  <p className="text-slate-500 text-sm">Tell us about yourself</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Full Name *</label>
                  <input
                    {...register('fullName')}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                    placeholder="John Smith"
                  />
                  {errors.fullName && <p className="mt-2 text-xs text-red-600 font-medium">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-2 text-xs text-red-600 font-medium">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      {...register('phone')}
                      type="tel"
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  {errors.phone && <p className="mt-2 text-xs text-red-600 font-medium">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Preferred Language *</label>
                  <select
                    {...register('preferredLanguage')}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="">Select language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  {errors.preferredLanguage && <p className="mt-2 text-xs text-red-600 font-medium">{errors.preferredLanguage.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      {...register('dateOfBirth')}
                      type="date"
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Users size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Relationship to Patient</h2>
                  <p className="text-slate-500 text-sm">How are you connected to the patient?</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Relationship Type *</label>
                  <select
                    {...register('relationshipType')}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.relationshipType && <p className="mt-2 text-xs text-red-600 font-medium">{errors.relationshipType.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Invitation Code *</label>
                  <div className="relative">
                    <input
                      {...register('invitationCode')}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-0 outline-none transition-all pr-28 ${
                        errors.invitationCode
                          ? 'border-red-200 focus:border-red-500'
                          : 'border-slate-200 focus:border-emerald-500'
                      }`}
                      placeholder="Enter invitation code"
                      onBlur={verifyInvitation}
                    />
                    {invitationVerified && (
                      <div className="absolute right-4 top-3.5 flex items-center gap-1.5 text-emerald-600 text-sm">
                        <CheckCircle2 size={16} />
                        <span className="font-medium">Verified</span>
                      </div>
                    )}
                  </div>
                  {errors.invitationCode && <p className="mt-2 text-xs text-red-600 font-medium">{errors.invitationCode.message}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    Enter code provided by your therapist or administrator.
                  </p>
                </div>
              </div>
            </div>

            {/* Account Security Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Lock size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Account Security</h2>
                  <p className="text-slate-500 text-sm">Create a secure password</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Password *</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-2 text-xs text-red-600 font-medium">{errors.password.message}</p>}

                  {/* Password Requirements */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className={`flex items-center gap-2 ${watchedPassword?.length >= 8 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {watchedPassword?.length >= 8 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      At least 8 characters
                    </p>
                    <p className={`flex items-center gap-2 ${/[A-Z]/.test(watchedPassword || '') ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {/[A-Z]/.test(watchedPassword || '') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      At least one uppercase letter
                    </p>
                    <p className={`flex items-center gap-2 ${/[0-9]/.test(watchedPassword || '') ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {/[0-9]/.test(watchedPassword || '') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      At least one number
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-2 text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
                  <p className="text-slate-500 text-sm">Choose how you want to receive updates</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Email Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    {...register('emailNotifications')}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">SMS Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    {...register('smsNotifications')}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Session Reminders</span>
                  </div>
                  <input
                    type="checkbox"
                    {...register('sessionReminders')}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>

            {/* Compliance Checkboxes */}
            <div className="pt-4 border-t border-slate-200">
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('agreeToTerms')}
                    className="mt-1 w-4.5 h-4.5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600">
                    I agree to the <a href="#" className="text-emerald-600 hover:underline font-medium">Terms of Service</a> *
                  </span>
                </label>
                {errors.agreeToTerms && <p className="ml-7 text-xs text-red-600 font-medium">{errors.agreeToTerms.message}</p>}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('agreeToPrivacy')}
                    className="mt-1 w-4.5 h-4.5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600">
                    I agree to the <a href="#" className="text-emerald-600 hover:underline font-medium">Privacy Policy</a> *
                  </span>
                </label>
                {errors.agreeToPrivacy && <p className="ml-7 text-xs text-red-600 font-medium">{errors.agreeToPrivacy.message}</p>}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('videoRecordingConsent')}
                    className="mt-1 w-4.5 h-4.5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600 flex items-start gap-2">
                    <Video className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>
                      I understand that my recordings may be reviewed for therapy purposes
                      <span className="text-slate-400 font-normal"> (optional)</span>
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
