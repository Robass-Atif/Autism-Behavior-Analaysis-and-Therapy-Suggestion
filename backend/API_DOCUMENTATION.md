
# ASD Therapy Platform - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [API Endpoints](#api-endpoints)
4. [Registration APIs](#registration-apis)
5. [Authentication APIs](#authentication-apis)
6. [User Management APIs](#user-management-apis)
7. [Invitation APIs](#invitation-apis)
8. [File Upload APIs](#file-upload-apis)
9. [Error Handling](#error-handling)
10. [Validation Rules](#validation-rules)

---

## Overview

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Content Type
```
Content-Type: application/json
```

For file uploads:
```
Content-Type: multipart/form-data
```

---

## Authentication Flow

### User Registration Flow
```
START → Select Role → Fill Registration Form → Email Verification → Account Approval (if needed) → Dashboard
```

### Role-Specific Flows

#### Therapist Registration Flow
```
1. Click "Sign up" link on login page
2. Select "Therapist" role
3. Fill registration form (credentials, license info, organization)
4. Upload license certificate
5. Submit application
6. Email verification (check inbox)
7. Admin approval (wait for approval)
8. Set up profile and digital signature
9. Access Therapist Dashboard
```

#### Caregiver Registration Flow
```
1. Click "Sign up" link on login page OR receive invitation email from Therapist
2. Select "Caregiver" role (or auto-selected if invited)
3. Fill registration form
4. Email verification
5. Therapist assigns patient(s)
6. Access Caregiver Dashboard
```

#### Admin Registration Flow
```
1. Admin accounts created by Super Admin only OR initial system setup creates first admin
2. Admin invitation sent via secure link
3. Admin completes profile
4. Two-factor authentication mandatory
5. Super Admin approval
6. Access Admin Dashboard
```

---

## API Endpoints

### Quick Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/auth/register/therapist` | Register therapist | No |
| POST | `/auth/register/caregiver` | Register caregiver | No |
| POST | `/auth/register/admin` | Register admin | No |
| POST | `/auth/login` | User login | No |
| GET | `/auth/verify-email` | Verify email | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password | No |
| POST | `/auth/resend-verification` | Resend verification email | No |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/users` | Get all users | Yes (Admin) |
| GET | `/users/pending-approvals` | Get pending approvals | Yes (Admin) |
| PUT | `/users/:id/approve` | Approve user | Yes (Admin) |
| PUT | `/users/:id/reject` | Reject user | Yes (Admin) |
| DELETE | `/users/:id` | Delete user | Yes (Admin) |
| POST | `/invitations` | Create invitation | Yes (Therapist) |
| GET | `/invitations` | Get my invitations | Yes (Therapist) |
| GET | `/invitations/validate/:code` | Validate invitation code | No |
| POST | `/upload/license` | Upload license | Yes |
| POST | `/upload/signature` | Upload signature | Yes |

---

## Registration APIs

### 1. Register Therapist

**Endpoint:** `POST /api/auth/register/therapist`

**Description:** Register a new therapist account with professional credentials.

**Request Body:**
```json
{
  "fullName": "Dr. John Smith",
  "professionalTitle": "Clinical Psychologist",
  "otherProfessionalTitle": "",
  "email": "john.smith@clinic.com",
  "phoneNumber": "+1234567890",
  "credentials": {
    "licenseNumber": "PSY-12345",
    "licenseType": "Clinical Psychologist License",
    "otherLicenseType": "",
    "issuingAuthority": "State Board of Psychology",
    "licenseExpiryDate": "2025-12-31"
  },
  "organization": {
    "organizationName": "ABC Therapy Center",
    "department": "Child Psychology",
    "workAddress": "123 Medical Plaza, Suite 456",
    "city": "New York",
    "stateProvince": "NY",
    "zipPostalCode": "10001",
    "country": "USA"
  },
  "references": [
    {
      "name": "Dr. Jane Doe",
      "email": "jane.doe@hospital.com",
      "phone": "+1987654321"
    }
  ],
  "password": "SecurePass@123",
  "confirmPassword": "SecurePass@123",
  "termsAccepted": true,
  "hipaaAccepted": true,
  "privacyPolicyAccepted": true,
  "twoFactorEnabled": false,
  "twoFactorMethod": "email"
}
```

**Registration Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **Personal Information** |
| fullName | string | Yes | Max 100 characters |
| professionalTitle | enum | Yes | See Professional Titles |
| otherProfessionalTitle | string | No | Required if title is "Other" |
| email | string | Yes | Valid email format |
| phoneNumber | string | Yes | With country code |
| **Professional Credentials** |
| credentials.licenseNumber | string | Yes | Alphanumeric |
| credentials.licenseType | enum | Yes | See License Types |
| credentials.otherLicenseType | string | No | Required if type is "Other" |
| credentials.issuingAuthority | string | Yes | - |
| credentials.licenseExpiryDate | date | Yes | Must be future date |
| **Organization/Practice** |
| organization.organizationName | string | Yes | - |
| organization.department | string | No | - |
| organization.workAddress | string | Yes | Multi-line |
| organization.city | string | Yes | - |
| organization.stateProvince | string | Yes | - |
| organization.zipPostalCode | string | Yes | - |
| organization.country | string | Yes | - |
| **Account Security** |
| password | string | Yes | Min 8 chars, uppercase, lowercase, number, special char |
| confirmPassword | string | Yes | Must match password |
| **References (Optional)** |
| references[].name | string | No | - |
| references[].email | string | No | Valid email |
| references[].phone | string | No | - |
| **Terms** |
| termsAccepted | boolean | Yes | Must be true |
| hipaaAccepted | boolean | Yes | Must be true |
| privacyPolicyAccepted | boolean | Yes | Must be true |
| **2FA (Optional)** |
| twoFactorEnabled | boolean | No | Default: false |
| twoFactorMethod | enum | No | "sms", "email", "authenticator" |

**Professional Titles (Enum):**
- `Clinical Psychologist`
- `Behavioral Therapist`
- `Occupational Therapist`
- `Speech Therapist`
- `Other`

**License Types (Enum):**
- `BCBA` - Board Certified Behavior Analyst
- `LCSW` - Licensed Clinical Social Worker
- `Clinical Psychologist License`
- `Other`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Therapist registration submitted. Please verify your email.",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "fullName": "Dr. John Smith",
    "email": "john.smith@clinic.com",
    "role": "therapist",
    "accountStatus": "pending_verification"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase, one lowercase, one number, and one special character"
    }
  ]
}
```

---

### 2. Register Caregiver

**Endpoint:** `POST /api/auth/register/caregiver`

**Description:** Register a new caregiver account (parent, guardian, or professional caregiver).

**Request Body:**
```json
{
  "fullName": "Mary Johnson",
  "email": "mary.johnson@email.com",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1985-06-15",
  "preferredLanguage": "English",
  "otherLanguage": "",
  "relationshipType": "Parent",
  "otherRelationshipType": "",
  "password": "SecurePass@123",
  "confirmPassword": "SecurePass@123",
  "invitationCode": "ABC12345",
  "emergencyContact": {
    "name": "Robert Johnson",
    "phone": "+1987654321",
    "relationship": "Spouse"
  },
  "termsAccepted": true,
  "privacyPolicyAccepted": true,
  "videoRecordingConsentAccepted": true,
  "notificationPreferences": {
    "emailNotifications": true,
    "smsNotifications": false,
    "recordingReminders": true
  }
}
```

**Registration Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **Personal Information** |
| fullName | string | Yes | Max 100 characters |
| email | string | Yes | Valid email, unique |
| phoneNumber | string | Yes | With country code |
| dateOfBirth | date | No | For age verification |
| preferredLanguage | enum | Yes | See Languages |
| otherLanguage | string | No | Required if "Other" |
| **Relationship to Patient** |
| relationshipType | enum | Yes | See Relationship Types |
| otherRelationshipType | string | No | Required if "Other" |
| **Account Security** |
| password | string | Yes | Min 8 chars, uppercase, lowercase, number |
| confirmPassword | string | Yes | Must match password |
| **Invitation (Optional)** |
| invitationCode | string | No | 8-character code from therapist |
| **Emergency Contact (Optional)** |
| emergencyContact.name | string | No | - |
| emergencyContact.phone | string | No | - |
| emergencyContact.relationship | string | No | - |
| **Terms** |
| termsAccepted | boolean | Yes | Must be true |
| privacyPolicyAccepted | boolean | Yes | Must be true |
| videoRecordingConsentAccepted | boolean | Yes | Must be true |
| **Notifications (Optional)** |
| notificationPreferences.emailNotifications | boolean | No | Default: true |
| notificationPreferences.smsNotifications | boolean | No | Default: false |
| notificationPreferences.recordingReminders | boolean | No | Default: true |

**Preferred Languages (Enum):**
- `English`
- `Spanish`
- `Urdu`
- `Other`

**Relationship Types (Enum):**
- `Parent`
- `Guardian`
- `Family Member`
- `Professional Caregiver`
- `Teacher/Educator`
- `Other`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Caregiver registration submitted. Please verify your email.",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "fullName": "Mary Johnson",
    "email": "mary.johnson@email.com",
    "role": "caregiver",
    "accountStatus": "pending_verification"
  }
}
```

---

### 3. Register Admin

**Endpoint:** `POST /api/auth/register/admin`

**Description:** Register a new admin account. Requires approval code from existing Super Admin.

**Request Body:**
```json
{
  "fullName": "Admin User",
  "email": "admin@asdtherapy.com",
  "phoneNumber": "+1234567890",
  "employeeId": "EMP-001",
  "adminLevel": "system_admin",
  "organizationName": "ASD Therapy Platform",
  "department": "IT Department",
  "password": "VerySecure@Pass123!",
  "confirmPassword": "VerySecure@Pass123!",
  "twoFactorMethod": "authenticator",
  "twoFactorPhone": "+1234567890",
  "backupEmail": "backup@email.com",
  "securityQuestions": [
    {
      "question": "What was your first pet's name?",
      "answer": "Fluffy"
    },
    {
      "question": "What city were you born in?",
      "answer": "New York"
    },
    {
      "question": "What is your mother's maiden name?",
      "answer": "Smith"
    }
  ],
  "accessJustification": "System administrator responsible for platform maintenance and user support.",
  "adminCodeOfConductAccepted": true,
  "systemAccessPolicyAccepted": true,
  "securityResponsibilityAccepted": true,
  "hipaaAccepted": true,
  "approvingSuperAdminEmail": "superadmin@asdtherapy.com",
  "approvalCode": "SA-APPROVE-2024"
}
```

**Registration Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **Personal Information** |
| fullName | string | Yes | Max 100 characters |
| email | string | Yes | Must be organizational domain |
| phoneNumber | string | Yes | With country code |
| employeeId | string | Yes | Must be verified |
| **Administrative Role** |
| adminLevel | enum | Yes | See Admin Levels |
| **Organization Details** |
| organizationName | string | Yes | Pre-filled from config |
| department | string | Yes | See Departments |
| **Account Security** |
| password | string | Yes | Min 12 chars (stricter) |
| confirmPassword | string | Yes | Must match password |
| **Two-Factor Authentication (Mandatory)** |
| twoFactorMethod | enum | Yes | "authenticator", "sms", "email" |
| twoFactorPhone | string | Conditional | Required if SMS selected |
| backupEmail | string | No | Backup 2FA email |
| **Security Questions (Mandatory)** |
| securityQuestions | array | Yes | Exactly 3 questions |
| securityQuestions[].question | string | Yes | - |
| securityQuestions[].answer | string | Yes | Unique answers |
| **Access Justification** |
| accessJustification | string | Yes | Why admin access needed |
| **Terms and Conditions** |
| adminCodeOfConductAccepted | boolean | Yes | Must be true |
| systemAccessPolicyAccepted | boolean | Yes | Must be true |
| securityResponsibilityAccepted | boolean | Yes | Must be true |
| hipaaAccepted | boolean | Yes | Must be true |
| **Approval** |
| approvingSuperAdminEmail | string | Yes | Must match existing super admin |
| approvalCode | string | Yes | Min 6 characters |

**Admin Levels (Enum):**
| Level | Description | Permissions |
|-------|-------------|-------------|
| `super_admin` | Full system access | All permissions |
| `system_admin` | System management | User management, system config |
| `security_admin` | Security & compliance | Audit logs, security settings |
| `read_only_admin` | Monitoring only | View-only access |

**Departments (Enum):**
- `IT Department`
- `Clinical Administration`
- `Compliance & Security`
- `Other`

**Password Requirements for Admin:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)
- Cannot contain common words

**Success Response (201):**
```json
{
  "success": true,
  "message": "Admin registration submitted. Please verify your email and complete 2FA setup.",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "fullName": "Admin User",
    "email": "admin@asdtherapy.com",
    "role": "admin",
    "adminLevel": "system_admin",
    "accountStatus": "pending_verification"
  }
}
```

---

## Authentication APIs

### 4. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "fullName": "John Smith",
    "email": "user@example.com",
    "role": "therapist",
    "accountStatus": "active",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

| Status | Message | Reason |
|--------|---------|--------|
| 401 | Invalid email or password | Wrong credentials |
| 403 | Please verify your email before logging in | Email not verified |
| 403 | Your account is pending admin approval | Awaiting approval |
| 403 | Your account has been suspended | Account suspended |
| 403 | Your account has been deactivated | Account deactivated |

---

### 5. Verify Email

**Endpoint:** `GET /api/auth/verify-email?token=<verification_token>`

**Description:** Verify user's email address using the token sent via email.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Verification token from email |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully. Your account is pending admin approval."
}
```

**Note:** Message varies based on role:
- Therapist/Admin: "...pending admin approval"
- Caregiver: "...You can now login"

---

### 6. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link will be sent."
}
```

---

### 7. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecure@Pass123",
  "confirmPassword": "NewSecure@Pass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

---

### 8. Resend Verification Email

**Endpoint:** `POST /api/auth/resend-verification`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification email sent successfully."
}
```

---

### 9. Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "user@example.com",
    "role": "therapist"
  }
}
```

---

## User Management APIs

### 10. Get All Users (Admin Only)

**Endpoint:** `GET /api/users`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role (therapist, caregiver, admin) |

**Success Response (200):**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Dr. John Smith",
      "email": "john@clinic.com",
      "role": "therapist",
      "accountStatus": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 11. Get Pending Approvals (Admin Only)

**Endpoint:** `GET /api/users/pending-approvals`

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Dr. Jane Doe",
      "email": "jane@clinic.com",
      "role": "therapist",
      "accountStatus": "pending_approval",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 12. Approve User (Admin Only)

**Endpoint:** `PUT /api/users/:id/approve`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User ID to approve |

**Success Response (200):**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "fullName": "Dr. Jane Doe",
    "accountStatus": "active"
  }
}
```

---

### 13. Reject User (Admin Only)

**Endpoint:** `PUT /api/users/:id/reject`

**Request Body:**
```json
{
  "reason": "Invalid license credentials provided"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User rejected",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "accountStatus": "suspended"
  }
}
```

---

### 14. Update User Status (Admin Only)

**Endpoint:** `PUT /api/users/:id/status`

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Account Status Values:**
| Status | Description |
|--------|-------------|
| `pending_verification` | Email not verified |
| `pending_approval` | Awaiting admin approval |
| `active` | Fully active account |
| `suspended` | Temporarily suspended |
| `deactivated` | Permanently deactivated |

---

### 15. Delete User (Admin Only)

**Endpoint:** `DELETE /api/users/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Invitation APIs

### 16. Create Invitation (Therapist Only)

**Endpoint:** `POST /api/invitations`

**Description:** Create an invitation code for a caregiver to register.

**Request Body:**
```json
{
  "therapistName": "Dr. John Smith",
  "recipientEmail": "caregiver@email.com"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Invitation created and email sent",
  "data": {
    "code": "ABC12345",
    "expiresAt": "2024-01-22T10:30:00.000Z"
  }
}
```

**Note:** If `recipientEmail` is not provided, only the code is generated without sending an email.

---

### 17. Get My Invitations (Therapist Only)

**Endpoint:** `GET /api/invitations`

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "code": "ABC12345",
      "recipientEmail": "caregiver@email.com",
      "expiresAt": "2024-01-22T10:30:00.000Z",
      "isUsed": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 18. Validate Invitation Code (Public)

**Endpoint:** `GET /api/invitations/validate/:code`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | 8-character invitation code |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation code is valid",
  "data": {
    "therapistName": "Dr. John Smith",
    "expiresAt": "2024-01-22T10:30:00.000Z"
  }
}
```

**Error Response (200):**
```json
{
  "success": false,
  "message": "Invalid or expired invitation code"
}
```

---

### 19. Resend Invitation (Therapist Only)

**Endpoint:** `POST /api/invitations/:id/resend`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation resent successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "code": "ABC12345",
    "expiresAt": "2024-01-29T10:30:00.000Z"
  }
}
```

---

### 20. Revoke Invitation (Therapist Only)

**Endpoint:** `DELETE /api/invitations/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation revoked successfully"
}
```

---

## File Upload APIs

### 21. Upload License Certificate

**Endpoint:** `POST /api/upload/license`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | License certificate file |

**Allowed File Types:** PDF, JPG, PNG
**Max File Size:** 5MB

**Success Response (201):**
```json
{
  "success": true,
  "message": "License certificate uploaded successfully",
  "data": {
    "path": "licenses/license_64f1a2b3_abc123.pdf"
  }
}
```

---

### 22. Upload Digital Signature

**Endpoint:** `POST /api/upload/signature`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Digital signature image |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Digital signature uploaded successfully",
  "data": {
    "path": "signatures/signature_64f1a2b3_xyz789.png"
  }
}
```

---

### 23. Get Uploaded File

**Endpoint:** `GET /api/upload/:type/:filename`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | "licenses", "signatures", "documents" |
| filename | string | Yes | File name |

**Success Response:** Returns the file

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized (Invalid/Missing Token) |
| 403 | Forbidden (Insufficient Permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., Email already exists) |
| 500 | Internal Server Error |

---

## Validation Rules

### Password Validation

**Therapist/Caregiver:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Special character recommended (@$!%*?&)

**Admin:**
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)
- Cannot contain common words

### Email Validation

- Must be valid email format
- Must be unique in the system
- Admin emails must be from organizational domain

### File Upload Validation

- Maximum file size: 5MB (5,242,880 bytes)
- Allowed formats: PDF, JPG, JPEG, PNG, GIF
- Files are stored with unique names to prevent conflicts

### Phone Number Validation

- Must include country code
- Format: +[country code][number]
- Example: +1234567890

---

## Account Statuses

| Status | Description | Can Login |
|--------|-------------|-----------|
| `pending_verification` | Email not verified yet | No |
| `pending_approval` | Awaiting admin approval | No |
| `active` | Account fully active | Yes |
| `suspended` | Temporarily suspended by admin | No |
| `deactivated` | Permanently deactivated | No |

---

## User Roles & Permissions

| Permission | Therapist | Caregiver | Admin | Super Admin |
|------------|-----------|-----------|-------|-------------|
| View own profile | ✓ | ✓ | ✓ | ✓ |
| Update own profile | ✓ | ✓ | ✓ | ✓ |
| Create invitations | ✓ | ✗ | ✗ | ✗ |
| View assigned patients | ✓ | ✓ | ✓ | ✓ |
| Manage patients | ✓ | ✗ | ✓ | ✓ |
| View all users | ✗ | ✗ | ✓ | ✓ |
| Approve/Reject users | ✗ | ✗ | ✓ | ✓ |
| Delete users | ✗ | ✗ | ✓ | ✓ |
| System configuration | ✗ | ✗ | Limited | ✓ |
| Create admin accounts | ✗ | ✗ | ✗ | ✓ |

---

## Swagger Documentation

Access interactive API documentation at:
```
http://localhost:5000/api/docs
```

Features:
- Try out API endpoints directly
- View request/response schemas
- Download OpenAPI specification
