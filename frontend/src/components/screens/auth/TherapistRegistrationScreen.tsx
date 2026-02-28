import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import {
  RegisterTherapistData,
  useRegisterTherapist,
  useCheckRegistrationEligibility,
} from "../../../api/auth";
import toast from "react-hot-toast";
import {
  Upload,
  X,
  Plus,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

// Zod Schema for Therapist Registration with full validation
const therapistRegistrationSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    professionalTitle: z.string().min(2, "Professional title is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Valid phone number is required"),
    licenseNumber: z
      .string()
      .min(4, "License number is required")
      .max(50, "License number must be less than 50 characters"),
    licenseType: z.string().min(2, "License type is required"),
    issuingAuthority: z.string().min(2, "Issuing authority is required"),
    licenseExpiryDate: z
      .string()
      .refine((date) => new Date(date) > new Date(), {
        message: "License must not be expired",
      }),
    organizationName: z.string().optional(),
    department: z.string().optional(),
    workAddress: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to the Terms of Service"),
    agreeToHIPAA: z
      .boolean()
      .refine((val) => val === true, "You must agree to HIPAA Compliance"),
    agreeToPrivacy: z
      .boolean()
      .refine((val) => val === true, "You must agree to the Privacy Policy"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type TherapistFormInputs = z.infer<typeof therapistRegistrationSchema>;

const PROFESSIONAL_TITLES = [
  "Clinical Psychologist",
  "Behavioral Therapist",
  "Occupational Therapist",
  "Speech Therapist",
  "Other",
];

const LICENSE_TYPES = [
  "BCBA",
  "LCSW",
  "Clinical Psychologist License",
  "Other",
];

const DEPARTMENTS = [
  "Behavioral Therapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Clinical Psychology",
  "Pediatrics",
  "Neurology",
];

export default function TherapistRegistrationScreen() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [emailCheckError, setEmailCheckError] = useState<string | null>(null);

  // Mutations
  const registerMutation = useRegisterTherapist();
  const checkEligibilityMutation = useCheckRegistrationEligibility();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<TherapistFormInputs>({
    resolver: zodResolver(therapistRegistrationSchema),
    mode: "onBlur",
    defaultValues: {
      agreeToTerms: false,
      agreeToHIPAA: false,
      agreeToPrivacy: false,
    },
  });

  const watchedEmail = watch("email");
  const watchedPassword = watch("password");

  const checkEmailEligibility = async (email: string) => {
    if (!email || !email.includes("@")) return;

    setEmailCheckError(null);
    try {
      const result = await checkEligibilityMutation.mutateAsync(email);

      if (!result.eligible) {
        if (result.message) {
          setEmailCheckError(result.message);
        } else {
          setEmailCheckError("This email is not eligible for registration.");
        }
      }
    } catch (error) {
      console.error("Email check error:", error);
      // Don't block user on network error, let submit handle it
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setLicenseFile(file);
    }
  };

  const handleRemoveFile = () => {
    setLicenseFile(null);
  };

  const onSubmit = async (data: TherapistFormInputs) => {
    // Check email eligibility before submitting if not already blocked
    if (emailCheckError) {
      toast.error(
        "Please resolve the email eligibility issue before submitting.",
      );
      return;
    }

    try {
      // Prepare API data payload matching backend expectation
      const apiData: RegisterTherapistData = {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        fullName: data.fullName,
        professionalTitle: data.professionalTitle,
        phoneNumber: data.phone, // Map form's phone to API's phoneNumber
        licenseNumber: data.licenseNumber,
        licenseType: data.licenseType,
        issuingAuthority: data.issuingAuthority,
        licenseExpiryDate: data.licenseExpiryDate,
        organizationName: data.organizationName || "",
        workAddress: data.workAddress || "",
        termsAccepted: data.agreeToTerms,
        hipaaAccepted: data.agreeToHIPAA,
        privacyPolicyAccepted: data.agreeToPrivacy,
        licenseCertificate: licenseFile || undefined,
      };

      const result = await registerMutation.mutateAsync(apiData);

      toast.success(
        result.message || "Registration successful! Please verify your email.",
      );

      // Delay to show success message before redirect
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    } catch (error: any) {
      console.error("Registration failed:", error);
      // Show a cleaner error message - extract first issue or show generic message
      let errorMessage = "Registration failed. Please try again.";
      if (error.message) {
        // Split by comma and get first error only
        const firstError = error.message.split(",")[0].trim();
        if (firstError && firstError.length < 100) {
          errorMessage = firstError;
        }
      }
      toast.error(errorMessage);
    }
  };

  const nextStep = async () => {
    const fieldsForStep1 = ["fullName", "professionalTitle", "email", "phone"];
    const fieldsForStep2 = [
      "licenseNumber",
      "licenseType",
      "issuingAuthority",
      "licenseExpiryDate",
    ];
    const fieldsForStep3 = ["organizationName", "workAddress", "department"];

    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger(fieldsForStep1 as any);
      if (isValid && watchedEmail && !emailCheckError) {
        // Double check email before moving forward if it was just typed
        await checkEmailEligibility(watchedEmail);
        if (emailCheckError) isValid = false;
      }
    } else if (currentStep === 2) {
      isValid = await trigger(fieldsForStep2 as any);
    } else if (currentStep === 3) {
      isValid = await trigger(fieldsForStep3 as any);
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-4">
          <div>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="mb-4 text-xs font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-2 transition-colors uppercase tracking-widest"
            >
              <X size={14} /> Cancel Process
            </button>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900">
              THERAPIST REGISTRATION
            </h1>
            <p className="mt-2 text-zinc-500 text-sm">
              Join the professional network.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Progress Sidebar (Desktop) / Topbar (Mobile) */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-8">
              <div className="flex lg:flex-col lg:items-start items-center justify-between lg:justify-start gap-4 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex-shrink-0 group">
                    <div
                      className={`flex items-center gap-3 transition-colors duration-300 ${
                        step === currentStep
                          ? "text-zinc-900"
                          : step < currentStep
                            ? "text-zinc-400"
                            : "text-zinc-200"
                      }`}
                    >
                      <div
                        className={`
                        w-8 h-8 flex items-center justify-center text-xs font-bold border transition-all duration-300
                        ${
                          step === currentStep
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : step < currentStep
                              ? "bg-zinc-100 text-zinc-500 border-zinc-200"
                              : "bg-white text-zinc-300 border-zinc-200 group-hover:border-zinc-300"
                        }
                      `}
                      >
                        {step < currentStep ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          `0${step}`
                        )}
                      </div>
                      <div className="hidden lg:block">
                        <div className="text-xs font-bold uppercase tracking-wider">
                          {step === 1 && "Personal Info"}
                          {step === 2 && "Credentials"}
                          {step === 3 && "Organization"}
                          {step === 4 && "Security"}
                        </div>
                        {step === currentStep && (
                          <div className="h-0.5 w-full bg-zinc-900 mt-1 animate-in slide-in-from-left-2 duration-300"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="flex-1">
            <div className="bg-white border border-zinc-200 p-6 md:p-10 shadow-[0_0_0_1px_rgba(228,228,231,0.5)] relative overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 right-0 p-2">
                <div className="w-2 h-2 border-t border-r border-zinc-300"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-2">
                <div className="w-2 h-2 border-b border-l border-zinc-300"></div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="relative z-10">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <Briefcase size={20} /> Personal Details
                      </h2>
                    </div>

                    {emailCheckError && (
                      <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm flex gap-3 items-start">
                        <AlertCircle
                          size={16}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold mb-1">REGISTRATION BLOCKED</p>
                          <p>{emailCheckError}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                      <div className="md:col-span-2 group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register("fullName")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all placeholder:text-zinc-300"
                          placeholder="Ex: Dr. Sarah Johnson"
                        />
                        {errors.fullName && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Professional Title{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("professionalTitle")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">SELECT TITLE...</option>
                          {PROFESSIONAL_TITLES.map((title) => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                        {errors.professionalTitle && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.professionalTitle.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            {...register("email")}
                            type="email"
                            className={`w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all ${emailCheckError ? "border-red-300 bg-red-50/10" : ""}`}
                            placeholder="name@clinic.com"
                            onBlur={() =>
                              watchedEmail &&
                              checkEmailEligibility(watchedEmail)
                            }
                          />
                          {checkEligibilityMutation.isPending && (
                            <div className="absolute right-3 top-3">
                              <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        {errors.email && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register("phone")}
                          type="tel"
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                          placeholder="+1 (555) 000-0000"
                        />
                        {errors.phone && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.phone.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Credentials */}
                {currentStep === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <GraduationCap size={20} /> Professional Credentials
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          License Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register("licenseNumber")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all uppercase placeholder:normal-case"
                          placeholder="Enter license #"
                        />
                        {errors.licenseNumber && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.licenseNumber.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          License Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("licenseType")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">SELECT TYPE...</option>
                          {LICENSE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        {errors.licenseType && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.licenseType.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Issuing Authority{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register("issuingAuthority")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                          placeholder="e.g. BACB"
                        />
                        {errors.issuingAuthority && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.issuingAuthority.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register("licenseExpiryDate")}
                          type="date"
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                        />
                        {errors.licenseExpiryDate && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.licenseExpiryDate.message}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                          License Document
                        </label>
                        <div className="border border-dashed border-zinc-300 p-8 text-center bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 transition-all cursor-pointer group relative">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="license-upload"
                          />
                          {!licenseFile ? (
                            <div className="flex flex-col items-center gap-2">
                              <Upload
                                className="text-zinc-400 group-hover:text-zinc-600 transition-colors"
                                size={24}
                              />
                              <p className="text-sm font-bold text-zinc-600">
                                CLICK TO UPLOAD
                              </p>
                              <p className="text-xs text-zinc-400 font-mono">
                                PDF/JPG MAX 5MB
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-white border border-zinc-200 p-3 w-full">
                              <div className="flex items-center gap-3">
                                <FileText size={18} className="text-zinc-400" />
                                <div className="text-left">
                                  <p className="text-xs font-bold text-zinc-900 truncate max-w-[200px]">
                                    {licenseFile.name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono">
                                    {(licenseFile.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveFile();
                                }}
                                className="z-20 text-zinc-400 hover:text-red-600 transition-colors hover:bg-zinc-100 p-1 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Organization */}
                {currentStep === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <MapPin size={20} /> Organization Info
                      </h2>
                    </div>

                    <div className="space-y-6">
                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Org Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register("organizationName")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                          placeholder="Clinic or Hospital Name"
                        />
                        {errors.organizationName && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.organizationName.message}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Department
                        </label>
                        <select
                          {...register("department")}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">SELECT DEPARTMENT...</option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Work Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          {...register("workAddress")}
                          rows={3}
                          className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all resize-none"
                          placeholder="Detailed address..."
                        />
                        {errors.workAddress && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.workAddress.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Security */}
                {currentStep === 4 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="border-b border-zinc-100 pb-4 mb-6">
                      <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <Lock size={20} /> Security Setup
                      </h2>
                    </div>

                    <div className="space-y-6">
                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Password <span className="text-red-500">*</span>
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
                            className="absolute right-4 top-3 text-zinc-400 hover:text-zinc-600"
                          >
                            {showPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.password.message}
                          </p>
                        )}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div
                            className={`text-[10px] uppercase font-bold px-2 py-1 border ${watchedPassword?.length >= 8 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-zinc-50 text-zinc-400 border-zinc-200"}`}
                          >
                            Min 8 Chars
                          </div>
                          <div
                            className={`text-[10px] uppercase font-bold px-2 py-1 border ${/[A-Z]/.test(watchedPassword || "") ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-zinc-50 text-zinc-400 border-zinc-200"}`}
                          >
                            1 Uppercase
                          </div>
                          <div
                            className={`text-[10px] uppercase font-bold px-2 py-1 border ${/[0-9]/.test(watchedPassword || "") ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-zinc-50 text-zinc-400 border-zinc-200"}`}
                          >
                            1 Number
                          </div>
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 group-focus-within:text-zinc-900 transition-colors">
                          Confirm Password{" "}
                          <span className="text-red-500">*</span>
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
                            className="absolute right-4 top-3 text-zinc-400 hover:text-zinc-600"
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={10} />{" "}
                            {errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-6 border-t border-zinc-100 space-y-4">
                        <label className="flex items-start gap-4 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              {...register("agreeToTerms")}
                              className="peer h-5 w-5 cursor-pointer appearance-none border border-zinc-300 bg-white checked:bg-zinc-900 checked:border-zinc-900 transition-all rounded-sm"
                            />
                            <CheckCircle2
                              size={12}
                              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                            />
                          </div>
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-700 font-medium">
                            I accept the{" "}
                            <a
                              href="#"
                              className="text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
                            >
                              Terms of Service
                            </a>
                          </span>
                        </label>
                        {errors.agreeToTerms && (
                          <p className="ml-9 -mt-3 text-xs text-red-500 font-bold">
                            {errors.agreeToTerms.message}
                          </p>
                        )}

                        <label className="flex items-start gap-4 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              {...register("agreeToHIPAA")}
                              className="peer h-5 w-5 cursor-pointer appearance-none border border-zinc-300 bg-white checked:bg-zinc-900 checked:border-zinc-900 transition-all rounded-sm"
                            />
                            <CheckCircle2
                              size={12}
                              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                            />
                          </div>
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-700 font-medium">
                            I acknowledge{" "}
                            <strong className="text-zinc-900">
                              HIPAA Compliance
                            </strong>{" "}
                            requirements
                          </span>
                        </label>
                        {errors.agreeToHIPAA && (
                          <p className="ml-9 -mt-3 text-xs text-red-500 font-bold">
                            {errors.agreeToHIPAA.message}
                          </p>
                        )}

                        <label className="flex items-start gap-4 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              {...register("agreeToPrivacy")}
                              className="peer h-5 w-5 cursor-pointer appearance-none border border-zinc-300 bg-white checked:bg-zinc-900 checked:border-zinc-900 transition-all rounded-sm"
                            />
                            <CheckCircle2
                              size={12}
                              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                            />
                          </div>
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-700 font-medium">
                            I accept the{" "}
                            <a
                              href="#"
                              className="text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
                            >
                              Privacy Policy
                            </a>
                          </span>
                        </label>
                        {errors.agreeToPrivacy && (
                          <p className="ml-9 -mt-3 text-xs text-red-500 font-bold">
                            {errors.agreeToPrivacy.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Footer */}
                <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      disabled={registerMutation.isPending}
                      onClick={prevStep}
                      className={`px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all ${registerMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      &larr; Previous Step
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="group relative inline-flex items-center justify-center px-8 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-[0.98]"
                    >
                      <span className="mr-2">Next Step</span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={registerMutation.isPending}
                      className="group relative inline-flex items-center justify-center px-8 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed min-w-[200px]"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="mr-2 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span className="mr-2">Complete Registration</span>
                          <CheckCircle2 size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="mt-6 text-center">
              <p className="text-[10px] text-zinc-400 font-mono">
                SECURE ENCRYPTED CONNECTION // AES-256
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
