import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { AUTH_ENDPOINTS, USERS_ENDPOINTS } from "../config/apiConfig";
import { UserRole } from "../types";

// Types for Auth
export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    accountStatus: string;
  };
  token: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    accountStatus: string;
  };
}

export interface RegisterTherapistData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  dateOfBirth: string;
  professionalTitle: string;
  phoneNumber: string;
  licenseNumber: string;
  licenseType: string;
  issuingAuthority: string;
  licenseExpiryDate: string;
  organizationName?: string;
  department?: string;
  workAddress?: string;
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
  country?: string;
  bio?: string;
  yearsOfExperience?: number;
  termsAccepted: boolean;
  hipaaAccepted: boolean;
  privacyPolicyAccepted: boolean;
  licenseCertificate?: File;
}

export interface RegisterCaregiverData {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  preferredLanguage: string;
  relationshipType: string;
  password: string;
  confirmPassword: string;
  invitationCode: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  videoRecordingConsentAccepted: boolean;
  consentDecisionHistory?: Array<{
    decision: "GRANTED" | "REVOKED";
    timestamp: string;
  }>;
  notificationPreferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    recordingReminders?: boolean;
  };
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RegistrationEligibility {
  eligible: boolean;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: string;
  createdAt: string;
  onboardingCompleted?: boolean;
}

// ============ Auth Hooks ============

// Login
export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
    }): Promise<AuthResponse> => {
      console.log("🚀 Login API called with:", { email: credentials.email });
      console.log("🌐 API URL:", AUTH_ENDPOINTS.LOGIN);

      return apiClient.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, {
        email: credentials.email,
        password: credentials.password,
      });
    },
    onSuccess: (data) => {
      console.log("✅ Login successful:", data);

      // Save to BOTH localStorage AND cookies (hybrid approach)
      if (data.token) {
        const token = data.token;
        // Handle both response formats: data.user or data.data
        const userData = data.user || (data as any).data;
        console.log("👤 User data extracted:", userData);

        // Try localStorage first
        let localStorageSuccess = false;
        try {
          localStorage.setItem("token", token);
          if (userData) {
            localStorage.setItem("userRole", JSON.stringify(userData));
            console.log("💾 Token and userRole saved to localStorage");
          }
          localStorageSuccess = true;
        } catch (error) {
          console.warn("⚠️ localStorage blocked, using cookie fallback");
        }

        // Always set cookies as backup (works even if localStorage is blocked)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        document.cookie = `auth_token=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        if (userData) {
          document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        }
        console.log("🍪 Token saved to cookies (expires in 7 days)");

        if (!localStorageSuccess) {
          console.log("ℹ️ Using cookies only - session will persist");
        }
      }
    },
    onError: (error: any) => {
      console.error("❌ Login failed:", error);
    },
  });
};

// Check registration eligibility
export const useCheckRegistrationEligibility = () => {
  return useMutation({
    mutationFn: async (email: string): Promise<RegistrationEligibility> => {
      return apiClient.post<RegistrationEligibility>(
        AUTH_ENDPOINTS.CHECK_REGISTRATION_ELIGIBILITY,
        { email },
      );
    },
  });
};

// Register Therapist
export const useRegisterTherapist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: RegisterTherapistData,
    ): Promise<RegistrationResponse> => {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("confirmPassword", data.confirmPassword);
      formData.append("fullName", data.fullName);
      formData.append("dateOfBirth", data.dateOfBirth);
      formData.append("professionalTitle", data.professionalTitle);
      formData.append("phoneNumber", data.phoneNumber);
      formData.append("credentials[licenseNumber]", data.licenseNumber);
      formData.append("credentials[licenseType]", data.licenseType);
      formData.append("credentials[issuingAuthority]", data.issuingAuthority);
      formData.append("credentials[licenseExpiryDate]", data.licenseExpiryDate);
      if (data.organizationName)
        formData.append("organizationName", data.organizationName);
      if (data.department) formData.append("department", data.department);
      if (data.workAddress) formData.append("workAddress", data.workAddress);
      if (data.city) formData.append("city", data.city);
      if (data.stateProvince)
        formData.append("stateProvince", data.stateProvince);
      if (data.zipPostalCode)
        formData.append("zipPostalCode", data.zipPostalCode);
      if (data.country) formData.append("country", data.country);
      if (data.bio) formData.append("bio", data.bio);
      if (data.yearsOfExperience)
        formData.append("yearsOfExperience", String(data.yearsOfExperience));
      formData.append("termsAccepted", String(data.termsAccepted));
      formData.append("hipaaAccepted", String(data.hipaaAccepted));
      formData.append(
        "privacyPolicyAccepted",
        String(data.privacyPolicyAccepted),
      );
      if (data.licenseCertificate) {
        formData.append("licenseCertificate", data.licenseCertificate);
      }

      return apiClient.postFormData<RegistrationResponse>(
        AUTH_ENDPOINTS.REGISTER_THERAPIST,
        formData,
      );
    },
    onSuccess: (data) => {
      console.log("✅ Therapist registration successful:", data.message);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

// Register Caregiver
export const useRegisterCaregiver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterCaregiverData): Promise<AuthResponse> => {
      return apiClient.post<AuthResponse>(
        AUTH_ENDPOINTS.REGISTER_CAREGIVER,
        data,
      );
    },
    onSuccess: (data) => {
      try {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", JSON.stringify(data.user));
      } catch (error) {
        console.error("❌ Failed to save to localStorage:", error);
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

// Register Admin
export const useRegisterAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any): Promise<AuthResponse> => {
      return apiClient.post<AuthResponse>(AUTH_ENDPOINTS.REGISTER_ADMIN, data);
    },
    onSuccess: (data) => {
      try {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", JSON.stringify(data.user));
      } catch (error) {
        console.error("❌ Failed to save to localStorage:", error);
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

// Forgot Password
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (
      data: ForgotPasswordData,
    ): Promise<{ message: string }> => {
      return apiClient.post<{ message: string }>(
        AUTH_ENDPOINTS.FORGOT_PASSWORD,
        data,
      );
    },
  });
};

// Reset Password
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (
      data: ResetPasswordData,
    ): Promise<{ message: string }> => {
      return apiClient.post<{ message: string }>(
        AUTH_ENDPOINTS.RESET_PASSWORD,
        data,
      );
    },
  });
};

// Verify Email
export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: async (
      token: string,
    ): Promise<{ success: boolean; message: string }> => {
      return apiClient.get<{ success: boolean; message: string }>(
        `${AUTH_ENDPOINTS.VERIFY_EMAIL}?token=${token}`,
        false,
      );
    },
  });
};

// Resend Verification Email
export const useResendVerification = () => {
  return useMutation({
    mutationFn: async (email: string): Promise<{ message: string }> => {
      return apiClient.post<{ message: string }>(
        AUTH_ENDPOINTS.RESEND_VERIFICATION,
        { email },
      );
    },
  });
};

// Complete Onboarding
export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clinicName: string;
      clinicAddress: string;
      specialties: string[];
      bio?: string;
      workingHours: { start: string; end: string };
      consultationFee?: string;
    }): Promise<AuthResponse> => {
      return apiClient.post<AuthResponse>(
        AUTH_ENDPOINTS.COMPLETE_ONBOARDING,
        data,
      );
    },
    onSuccess: (data) => {
      try {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", JSON.stringify(data.user));
      } catch (error) {
        console.error("❌ Failed to save to localStorage:", error);
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

// Get Current User
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get<any>(USERS_ENDPOINTS.GET_ME);
      return response.data || response;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

// Update Profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any): Promise<any> => {
      return apiClient.put<any>(USERS_ENDPOINTS.UPDATE_PROFILE, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

// Change Password
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: any): Promise<any> => {
      return apiClient.put<any>(USERS_ENDPOINTS.CHANGE_PASSWORD, data);
    },
  });
};

// Logout
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.post<void>(AUTH_ENDPOINTS.LOGOUT, {});
    },
    onSuccess: () => {
      // Clear both cookies and localStorage
      document.cookie = "auth_token=; path=/; max-age=0";
      document.cookie = "user_data=; path=/; max-age=0";
      console.log("🍪 Cookies cleared");

      try {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        console.log("💾 localStorage cleared");
      } catch (error) {
        console.warn("⚠️ localStorage access denied during logout:", error);
      }
      queryClient.clear();
    },
  });
};

// Update Password (alias for Reset Password)
export const useUpdatePassword = useResetPassword;
