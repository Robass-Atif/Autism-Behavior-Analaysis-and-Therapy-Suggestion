/**
 * Database Seed Script
 *
 * Seeds the MongoDB database with the documents required for the server
 * to function correctly:
 *
 *   1. Super Admin  - needed for admin approval code validation
 *                     (auth.service.ts validateAdminApprovalCode)
 *   2. System Admin - needed to approve therapist applications and
 *                     manage users via the admin dashboard
 *
 * Each admin creates two documents (mirroring UsersService.createAdmin):
 *   - One in the `users` collection   (base User record)
 *   - One in the `admins` collection  (Admin-specific record)
 *
 * The script is idempotent: it skips documents that already exist.
 *
 * Usage:
 *   node scripts/seed.js
 *   -- or --
 *   npm run seed
 *
 * Default credentials (change after first login):
 *   Super Admin : superadmin@asdtherapy.com / SuperAdmin@123
 *   Admin       : admin@asdtherapy.com      / Admin@123
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Load environment variables from .env
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found at', envPath);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL || 'superadmin@asdtherapy.com';

const SEEDS = [
  {
    label: 'Super Admin',
    email: SUPER_ADMIN_EMAIL,
    password: 'SuperAdmin@123',
    fullName: 'Super Admin',
    role: 'super_admin',
    adminLevel: 'super_admin',
    permissions: ['*'],
  },
  {
    label: 'System Admin',
    email: 'admin@asdtherapy.com',
    password: 'Admin@123',
    fullName: 'System Admin',
    role: 'admin',
    adminLevel: 'system_admin',
    permissions: [],
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const adminsCol = db.collection('admins');

  for (const s of SEEDS) {
    // Check if the user already exists in either collection
    const existingUser = await usersCol.findOne({
      email: s.email.toLowerCase(),
    });
    const existingAdmin = await adminsCol.findOne({
      email: s.email.toLowerCase(),
    });

    if (existingUser && existingAdmin) {
      console.log(`[SKIP] ${s.label} already exists (${s.email})`);
      continue;
    }

    // Hash the password (matches the bcrypt salt rounds used in the schemas)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(s.password, salt);

    const now = new Date();
    const userId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    // Insert into `users` collection (base User document)
    if (!existingUser) {
      await usersCol.insertOne({
        _id: userId,
        fullName: s.fullName,
        email: s.email.toLowerCase(),
        password: hashedPassword,
        role: s.role,
        accountStatus: 'active',
        isEmailVerified: true,
        isActive: true,
        twoFactorEnabled: false,
        rejectionCount: 0,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
        __v: 0,
      });
    }

    // Insert into `admins` collection (Admin-specific document)
    if (!existingAdmin) {
      await adminsCol.insertOne({
        _id: adminId,
        userId: existingUser ? existingUser._id : userId,
        fullName: s.fullName,
        email: s.email.toLowerCase(),
        password: hashedPassword,
        role: s.role,
        accountStatus: 'active',
        isEmailVerified: true,
        isActive: true,
        twoFactorEnabled: false,
        rejectionCount: 0,
        onboardingCompleted: true,
        adminLevel: s.adminLevel,
        isApproved: true,
        isTwoFactorSetupComplete: false,
        permissions: s.permissions,
        adminCodeOfConductAccepted: true,
        systemAccessPolicyAccepted: true,
        securityResponsibilityAccepted: true,
        hipaaAccepted: true,
        createdAt: now,
        updatedAt: now,
        __v: 0,
      });
    }

    console.log(`[CREATED] ${s.label}`);
    console.log(`          Email    : ${s.email}`);
    console.log(`          Password : ${s.password}`);
    console.log('');
  }

  await mongoose.disconnect();
  console.log('Seed completed.');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
