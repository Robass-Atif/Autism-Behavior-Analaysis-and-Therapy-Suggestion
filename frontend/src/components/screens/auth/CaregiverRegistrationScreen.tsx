import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { formatPhoneNumber } from "../../../lib/formatters";
import {
  X,
  Mail,
  Phone,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Bell,
  Video,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useRegisterCaregiver } from "../../../api/auth";
import InformedConsentModal, {
  type ConsentDecision,
} from "../../common/InformedConsentModal";
import toast from "../../../lib/toast";

// ─── Shared validators ──────────────────────────────────────────────────────

/**
 * Email: standard format, blocks consecutive dots, duplicate TLDs (.com.com),
 * and ensures the TLD is 2–6 real letters.
 */
const emailValidator = z
  .string()
  .min(1, "Email address is required")
  .email("Enter a valid email address (e.g. name@example.com)")
  .refine(
    (val) => {
      // reject .com.com  or  ..  patterns
      if (/\.{2,}/.test(val)) return false;
      // reject duplicate consecutive TLD segments like .com.com
      const tldPart = val.split("@")[1] || "";
      if (/(\.[a-z]{2,6})\1/.test(tldPart)) return false;
      // TLD must end with 2-6 letters only
      return /\.[a-zA-Z]{2,6}$/.test(val);
    },
    { message: "Email domain is invalid (e.g. avoid .com.com or double dots)" },
  );

/**
 * Phone: accepts digits, spaces, dashes, parentheses and optional leading +.
 * Min 7 digits (local), max 15 (E.164 standard).
 */
const phoneValidator = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    { message: "Phone number must be 7–15 digits" },
  )
  .refine(
    (val) => /^[+]?[\d\s\-().]+$/.test(val),
    { message: "Phone may only contain digits, spaces, +, -, (, )" },
  );

/**
 * Date of Birth: required, user must be at least 18 and at most 120 years old.
 */
const dobValidator = z
  .string()
  .min(1, "Date of birth is required")
  .refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" },
  )
  .refine(
    (val) => {
      const dob = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      return age >= 18;
    },
    { message: "You must be at least 18 years old" },
  )
  .refine(
    (val) => {
      const dob = new Date(val);
      const today = new Date();
      return dob <= today;
    },
    { message: "Date of birth cannot be in the future" },
  )
  .refine(
    (val) => {
      const dob = new Date(val);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 120);
      return dob >= minDate;
    },
    { message: "Please enter a realistic date of birth" },
  );

// ─── Caregiver schema ────────────────────────────────────────────────────────

// Zod Schema for Caregiver Registration
const caregiverRegistrationSchema = z
  .object({
    // Step 1: Personal
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name is too long")
      .refine((val) => /^[a-zA-Z\s'.,-]+$/.test(val), {
        message: "Full name may only contain letters, spaces, and . , ' -",
      }),
    email: emailValidator,
    phone: phoneValidator,
    preferredLanguage: z.string().min(1, "Preferred language is required"),
    dateOfBirth: dobValidator,

    // Step 2: Relationship
    relationshipType: z.string().min(1, "Relationship type is required"),
    invitationCode: z.string().min(6, "Invitation code is required"),

    // Step 3: Security
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number")
      .regex(
        /[@$!%*?&.]/,
        "Password must contain a special character (@$!%*?&.)",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),

    // Step 4: Compliance & Meta
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to Terms of Service"),
    agreeToPrivacy: z
      .boolean()
      .refine((val) => val === true, "You must agree to Privacy Policy"),
    videoRecordingConsent: z.boolean().default(false),

    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    sessionReminders: z.boolean().default(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });


type CaregiverFormInputs = z.infer<typeof caregiverRegistrationSchema>;

const LANGUAGES = ["English", "Spanish", "Urdu", "Other"];

const RELATIONSHIP_TYPES = [
  "Parent",
  "Guardian",
  "Family Member",
  "Professional Caregiver",
  "Teacher/Educator",
  "Other",
];

export default function CaregiverRegistrationScreen() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationVerified, setInvitationVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentHistory, setConsentHistory] = useState<ConsentDecision[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
  } = useForm<CaregiverFormInputs>({
    resolver: zodResolver(caregiverRegistrationSchema),
    mode: "onBlur",
    defaultValues: {
      preferredLanguage: "English",
      emailNotifications: true,
      smsNotifications: true,
      sessionReminders: true,
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
  });

  const watchedPassword = watch("password");
  const watchedInvitationCode = watch("invitationCode");
  const watchedVideoRecordingConsent = watch("videoRecordingConsent");
  const registerMutation = useRegisterCaregiver();

  const totalSteps = 4;

  const verifyInvitation = async () => {
    if (watchedInvitationCode?.length >= 6) {
      setVerifying(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/invitations/validate/${watchedInvitationCode}`,
        );
        const data = await response.json();

        if (data.valid) {
          setInvitationVerified(true);
          toast.success("Invitation code verified");
        } else {
          setInvitationVerified(false);
          toast.error(data.message || "Invalid invitation code");
        }
      } catch (error) {
        setInvitationVerified(false);
        toast.error("Failed to verify code");
      } finally {
        setVerifying(false);
      }
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 1)
      fieldsToValidate = ["fullName", "email", "phone", "preferredLanguage", "dateOfBirth"];
    if (currentStep === 2)
      fieldsToValidate = ["relationshipType", "invitationCode"];
    if (currentStep === 3) fieldsToValidate = ["password", "confirmPassword"];

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      if (currentStep === 2 && !invitationVerified) {
        toast.error("Please verify your invitation code first");
        return;
      }
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const addConsentDecision = (decision: ConsentDecision["decision"]) => {
    setConsentHistory((prev) => [
      ...prev,
      {
        decision,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleGrantConsent = () => {
    setValue("videoRecordingConsent", true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    addConsentDecision("GRANTED");
    setIsConsentModalOpen(false);
    toast.success("Informed consent granted");
  };

  const handleRevokeConsent = () => {
    setValue("videoRecordingConsent", false, {
      shouldDirty: true,
      shouldValidate: true,
    });
    addConsentDecision("REVOKED");
    setIsConsentModalOpen(false);
    toast.success("Informed consent revoked");
  };

  const onSubmit = async (data: CaregiverFormInputs) => {
    if (!data.videoRecordingConsent) {
      toast.error("Please review and grant informed video consent before continuing");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phone,
        dateOfBirth: data.dateOfBirth,
        preferredLanguage: data.preferredLanguage,
        relationshipType: data.relationshipType,
        password: data.password,
        confirmPassword: data.confirmPassword,
        invitationCode: data.invitationCode,
        termsAccepted: data.agreeToTerms,
        privacyPolicyAccepted: data.agreeToPrivacy,
        videoRecordingConsentAccepted: data.videoRecordingConsent,
        consentDecisionHistory: consentHistory,
        notificationPreferences: {
          emailNotifications: data.emailNotifications,
          smsNotifications: data.smsNotifications,
          recordingReminders: data.sessionReminders,
        },
      });

      toast.success("Registration successful! Please login.");
      setTimeout(() => navigate({ to: "/login" }), 1500);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-4">
          <div>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="mb-4 text-xs font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-2 transition-colors uppercase tracking-widest"
            >
              <X size={14} /> Cancel Process
            </button>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900">
              CAREGIVER JOIN
            </h1>
            <p className="mt-2 text-zinc-500 text-sm">
              Support patient therapy journeys.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Progress */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-8">
              <div className="flex lg:flex-col lg:items-start items-center justify-between lg:justify-start gap-4 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 transition-colors duration-300 ${step === currentStep ? "text-zinc-900" : "text-zinc-300"}`}
                  >
                    <div
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold border ${step === currentStep ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-300 border-zinc-200"}`}
                    >
                      {step < currentStep ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        `0${step}`
                      )}
                    </div>
                    <div className="hidden lg:block text-xs font-bold uppercase tracking-wider">
                      {step === 1 && "Profile Info"}
                      {step === 2 && "Verification"}
                      {step === 3 && "Security"}
                      {step === 4 && "Compliance"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1">
            <div className="bg-white border border-zinc-200 p-6 md:p-10 relative overflow-hidden">
              {/* Accents */}
              <div className="absolute top-0 right-0 p-2">
                <div className="w-2 h-2 border-t border-r border-zinc-300"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-2">
                <div className="w-2 h-2 border-b border-l border-zinc-300"></div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="relative z-10">
                {/* Step 1: Profile Info */}
                {currentStep === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <User size={20} /> Personal Details
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Full Name *
                        </label>
                        <input
                          {...register("fullName")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                          placeholder="Enter your full name"
                        />
                        {errors.fullName && (
                          <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                            {errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group">
                          <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                            Email Address *
                          </label>
                          <input
                            {...register("email")}
                            type="email"
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                            placeholder="name@example.com"
                          />
                          {errors.email && (
                            <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                        <div className="group">
                          <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                            Phone Number *
                          </label>
                          <input
                            {...register("phone", {
                              onChange: (e) => {
                                e.target.value = formatPhoneNumber(e.target.value);
                              }
                            })}
                            type="tel"
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                            placeholder="+1 (555) 000-0000"
                          />
                          {errors.phone && (
                            <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                              {errors.phone.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group">
                          <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                            Preferred Language *
                          </label>
                          <select
                            {...register("preferredLanguage")}
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all appearance-none cursor-pointer"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="group">
                          <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                            Date Of Birth *
                          </label>
                          <input
                            {...register("dateOfBirth")}
                            type="date"
                            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                          />
                          {errors.dateOfBirth && (
                            <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                              {errors.dateOfBirth.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Verification */}
                {currentStep === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <ShieldCheck size={20} /> Identity Verification
                      </h2>
                    </div>

                    <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-900 text-[10px] font-bold uppercase mb-8">
                      Invitation Required (This portal is private access only.)
                    </div>

                    <div className="space-y-8">
                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Relationship to Patient *
                        </label>
                        <select
                          {...register("relationshipType")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">SELECT RELATIONSHIP...</option>
                          {RELATIONSHIP_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        {errors.relationshipType && (
                          <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                            {errors.relationshipType.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Invitation Code *
                        </label>
                        <div className="relative">
                          <input
                            {...register("invitationCode")}
                            onBlur={verifyInvitation}
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all font-mono uppercase placeholder:normal-case"
                            placeholder="Enter 6-digit code"
                          />
                          <div className="absolute right-4 top-3">
                            {verifying ? (
                              <Loader2
                                size={16}
                                className="animate-spin text-zinc-400"
                              />
                            ) : invitationVerified ? (
                              <CheckCircle2
                                size={16}
                                className="text-emerald-500"
                              />
                            ) : null}
                          </div>
                        </div>
                        {errors.invitationCode && (
                          <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                            {errors.invitationCode.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Security */}
                {currentStep === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <Lock size={20} /> Secure Credentials
                      </h2>
                    </div>

                    <div className="space-y-8">
                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all font-mono"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-3 text-zinc-400 hover:text-zinc-900 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                            {errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Confirm Password *
                        </label>
                        <div className="relative">
                          <input
                            {...register("confirmPassword")}
                            type={showConfirmPassword ? "text" : "password"}
                            className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all font-mono"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-4 top-3 text-zinc-400 hover:text-zinc-900 transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">
                            {errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Compliance */}
                {currentStep === 4 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <ShieldCheck size={20} /> Compliance Consent
                      </h2>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-50 border border-zinc-100 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            {...register("agreeToTerms")}
                            className="appearance-none w-4 h-4 border-2 border-zinc-300 checked:bg-zinc-900 checked:border-zinc-900 transition-all cursor-pointer"
                          />
                          <span className="text-[10px] font-bold uppercase text-zinc-600 group-hover:text-zinc-900 transition-colors">
                            Accept Terms of Service *
                          </span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            {...register("agreeToPrivacy")}
                            className="appearance-none w-4 h-4 border-2 border-zinc-300 checked:bg-zinc-900 checked:border-zinc-900 transition-all cursor-pointer"
                          />
                          <span className="text-[10px] font-bold uppercase text-zinc-600 group-hover:text-zinc-900 transition-colors">
                            Accept Privacy Policy *
                          </span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="hidden" {...register("videoRecordingConsent")} />
                          <button
                            type="button"
                            onClick={() => setIsConsentModalOpen(true)}
                            className="appearance-none w-4 h-4 border-2 border-zinc-300 bg-white data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 transition-all cursor-pointer"
                            data-state={watchedVideoRecordingConsent ? "checked" : "unchecked"}
                            aria-label="Open informed consent modal"
                          />
                          <div className="flex-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-600 group-hover:text-zinc-900 transition-colors block">
                              Video Recording Informed Consent *
                            </span>
                            <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-wider">
                              {watchedVideoRecordingConsent
                                ? "Status: Granted"
                                : "Status: Not Granted"}
                            </p>
                          </div>
                        </label>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsConsentModalOpen(true)}
                            className="px-3 py-2 border border-zinc-300 text-[10px] font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            Review Consent Details
                          </button>
                          {watchedVideoRecordingConsent && (
                            <button
                              type="button"
                              onClick={handleRevokeConsent}
                              className="px-3 py-2 border border-red-200 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Revoke Now
                            </button>
                          )}
                        </div>

                        {consentHistory.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                              Consent History
                            </p>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {consentHistory
                                .slice()
                                .reverse()
                                .map((entry, index) => (
                                  <p
                                    key={`${entry.timestamp}-${index}`}
                                    className="text-[10px] uppercase tracking-wider text-zinc-500"
                                  >
                                    {entry.decision} • {new Date(entry.timestamp).toLocaleString()}
                                  </p>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Navigation */}
                <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
                    >
                      Back Step
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-8 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-4 hover:bg-zinc-800 transition-all"
                    >
                      Next Step <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={registerMutation.isPending}
                      className="px-8 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-4 hover:bg-zinc-800 transition-all disabled:opacity-50"
                    >
                      {registerMutation.isPending
                        ? "Processing..."
                        : "Complete Registration"}{" "}
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            <InformedConsentModal
              isOpen={isConsentModalOpen}
              isGranted={watchedVideoRecordingConsent}
              consentHistory={consentHistory}
              onClose={() => setIsConsentModalOpen(false)}
              onGrant={handleGrantConsent}
              onRevoke={handleRevokeConsent}
            />

            <div className="mt-8 text-center text-[10px] text-zinc-300 font-mono tracking-tighter uppercase">
              Encrypted Auth Node (ABA-TS System V1.0)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
