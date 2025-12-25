# ASD Therapy Platform - Backend API

Multi-role authentication backend using **NestJS**, **MongoDB**, and **JWT** for the ASD Therapy Platform.

## Features

- **Multi-Role Registration**: Therapist, Caregiver, and Admin sign-up flows
- **Email Verification**: Secure email verification for all users
- **Admin Approval Workflow**: Therapists and Admins require admin approval
- **Invitation System**: Therapists can invite Caregivers via unique codes
- **File Upload**: License certificates and digital signatures
- **Two-Factor Authentication**: Optional 2FA for enhanced security
- **Role-Based Access Control**: Protected routes based on user roles
- **Swagger API Documentation**: Interactive API docs at `/api/docs`

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **MongoDB** - Database with Mongoose ODM
- **Passport JWT** - Authentication
- **class-validator** - Request validation
- **Nodemailer** - Email service
- **Multer** - File uploads

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@asdtherapy.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Admin Domains
ALLOWED_ADMIN_DOMAINS=asdtherapy.com
```

### 3. Run the Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Once the server is running, access Swagger docs at:
```
http://localhost:5000/api/docs
```

## API Endpoints

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/therapist` | Register as therapist |
| POST | `/api/auth/register/caregiver` | Register as caregiver |
| POST | `/api/auth/register/admin` | Register as admin |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/resend-verification` | Resend verification email |
| GET | `/api/auth/me` | Get current user (Protected) |

### Users (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/pending-approvals` | Get pending approvals |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id/approve` | Approve user |
| PUT | `/api/users/:id/reject` | Reject user |
| PUT | `/api/users/:id/status` | Update user status |
| DELETE | `/api/users/:id` | Delete user |

### Invitations (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invitations` | Create invitation |
| GET | `/api/invitations` | Get my invitations |
| GET | `/api/invitations/validate/:code` | Validate invitation code |
| POST | `/api/invitations/:id/resend` | Resend invitation |
| DELETE | `/api/invitations/:id` | Revoke invitation |

### File Uploads (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/license` | Upload license certificate |
| POST | `/api/upload/signature` | Upload digital signature |
| GET | `/api/upload/:type/:filename` | Get uploaded file |

## User Roles

| Role | Description | Approval Required |
|------|-------------|-------------------|
| `therapist` | Clinical professionals | Yes (Admin approval) |
| `caregiver` | Parents/Guardians | No |
| `admin` | System administrators | Yes (Super Admin approval) |
| `super_admin` | Full system access | Initial setup only |

## Registration Flows

### Therapist Registration
1. Fill registration form with credentials
2. Upload license certificate
3. Email verification
4. Admin approval
5. Access dashboard

### Caregiver Registration
1. Register directly or via therapist invitation
2. Email verification
3. Access dashboard immediately

### Admin Registration
1. Requires approval code from Super Admin
2. Organizational email required
3. Mandatory 2FA setup
4. Security questions required
5. Email verification
6. Super Admin approval

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── decorators/       # Custom decorators
│   │   └── enums/            # Enums (roles, status, etc.)
│   ├── modules/
│   │   ├── auth/             # Authentication module
│   │   │   ├── dto/          # Data transfer objects
│   │   │   ├── guards/       # JWT & Role guards
│   │   │   └── strategies/   # Passport strategies
│   │   ├── users/            # Users module
│   │   │   ├── dto/          # User DTOs
│   │   │   └── schemas/      # Mongoose schemas
│   │   ├── email/            # Email service
│   │   ├── invitation/       # Invitation system
│   │   └── upload/           # File upload service
│   ├── app.module.ts         # Root module
│   ├── health.controller.ts  # Health check
│   └── main.ts               # Entry point
├── uploads/                   # Uploaded files
├── .env                       # Environment variables
├── nest-cli.json             # NestJS CLI config
├── tsconfig.json             # TypeScript config
└── package.json
```

## Account Statuses

| Status | Description |
|--------|-------------|
| `pending_verification` | Email not verified |
| `pending_approval` | Awaiting admin approval |
| `active` | Account fully active |
| `suspended` | Account suspended |
| `deactivated` | Account deactivated |

## License

MIT
