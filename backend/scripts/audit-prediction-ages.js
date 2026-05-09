/**
 * Audit & Re-run Predictions With Wrong Age
 *
 * Background:
 *   ai-analysis.service.ts used to send `session.patientId.age` to FastAPI,
 *   but Patient documents have no `age` field — every request defaulted to
 *   age=5. This script finds completed sessions whose stored age (in
 *   rawPredictionResponse.processing_info.age, if present) does not match
 *   the patient's DOB-derived age, marks them for re-analysis, and
 *   optionally enqueues them.
 *
 * Modes:
 *   --dry-run   (default)  list affected sessions, change nothing
 *   --rerun                set status='approved_for_ai' so the analysis
 *                          worker picks them up on next tick
 *
 * Usage:
 *   node scripts/audit-prediction-ages.js              # dry-run
 *   node scripts/audit-prediction-ages.js --rerun      # mark for re-run
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

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
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

const RERUN = process.argv.includes('--rerun');

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

function readSentAge(session) {
  const raw = session.rawPredictionResponse;
  if (!raw) return null;
  const candidates = [
    raw?.processing_info?.age,
    raw?.processing_info?.metadata?.age,
    raw?.metadata?.age,
    raw?.input?.age,
    raw?.age,
  ];
  for (const v of candidates) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  const VideoSession = mongoose.connection.collection('videosessions');
  const Patients = mongoose.connection.collection('patients');

  const sessions = await VideoSession.find({
    status: { $in: ['completed', 'therapist_review', 'published'] },
    rawPredictionResponse: { $exists: true, $ne: null },
    deleted: { $ne: true },
  })
    .project({ _id: 1, patientId: 1, rawPredictionResponse: 1, status: 1 })
    .toArray();

  const stale = [];
  const missingDob = [];
  const noSentAge = [];

  for (const s of sessions) {
    const patient = await Patients.findOne(
      { _id: s.patientId },
      { projection: { dob: 1, fullName: 1 } },
    );
    if (!patient || !patient.dob) {
      missingDob.push({ sessionId: s._id, patientId: s.patientId });
      continue;
    }
    const expected = calculateAge(patient.dob);
    const sent = readSentAge(s);
    if (expected == null) {
      missingDob.push({ sessionId: s._id, patientId: s.patientId });
      continue;
    }
    if (sent == null) {
      noSentAge.push({
        sessionId: s._id,
        patientId: s.patientId,
        expectedAge: expected,
      });
      continue;
    }
    if (sent !== expected) {
      stale.push({
        sessionId: s._id.toString(),
        patient: patient.fullName,
        sentAge: sent,
        expectedAge: expected,
        status: s.status,
      });
    }
  }

  console.log('─'.repeat(70));
  console.log(`Sessions scanned:          ${sessions.length}`);
  console.log(`Stale-age sessions:        ${stale.length}`);
  console.log(`Sessions missing sent age: ${noSentAge.length}`);
  console.log(`Sessions w/o usable DOB:   ${missingDob.length}`);
  console.log('─'.repeat(70));

  if (stale.length > 0) {
    console.log('\nStale-age sessions:');
    for (const r of stale) {
      console.log(
        `  ${r.sessionId}  patient="${r.patient}"  sent=${r.sentAge}  expected=${r.expectedAge}  status=${r.status}`,
      );
    }
  }

  if (RERUN && stale.length > 0) {
    const ids = stale.map((r) => new mongoose.Types.ObjectId(r.sessionId));
    const update = await VideoSession.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'approved_for_ai',
          retryCount: 0,
          lastError: 'audit-prediction-ages: re-running due to stale age',
        },
      },
    );
    console.log(
      `\n✔ Marked ${update.modifiedCount} session(s) as approved_for_ai for re-analysis.`,
    );
  } else if (stale.length > 0) {
    console.log('\nDry-run only. Pass --rerun to mark these for re-analysis.');
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
