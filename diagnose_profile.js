
import { MongoClient, ObjectId } from 'mongodb';

async function diagnose() {
    const uri = 'mongodb://localhost:27017/ABA-TS'; // Adjust if different
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ABA-TS');
        const users = db.collection('users');
        const patients = db.collection('patients');

        const mrn = 'MRN-ML46GORO-XISG';
        const email = mrn.toLowerCase() + '@patient.neurocare.com';

        console.log(`Searching for user with email: ${email}`);
        const user = await users.findOne({ email });
        if (!user) {
            console.log('User not found!');
            return;
        }
        console.log('User found:', JSON.stringify(user, null, 2));

        console.log(`Searching for patient with MRN: ${mrn}`);
        const patientByMrn = await patients.findOne({ mrn });
        if (!patientByMrn) {
            console.log('Patient not found by MRN!');
        } else {
            console.log('Patient found by MRN:', JSON.stringify(patientByMrn, null, 2));
        }

        console.log(`Searching for patient with userId: ${user._id}`);
        const patientByUserId = await patients.findOne({ userId: user._id });
        if (!patientByUserId) {
            console.log('Patient NOT found by userId!');
        } else {
            console.log('Patient found by userId:', JSON.stringify(patientByUserId, null, 2));
        }

        // Check if there are any patients with userId that is NOT an ObjectId
        const patientsWithRawUserId = await patients.find({ userId: { $type: 'string' } }).toArray();
        if (patientsWithRawUserId.length > 0) {
            console.log(`Found ${patientsWithRawUserId.length} patients with string userId instead of ObjectId`);
        }

    } finally {
        await client.close();
    }
}

diagnose();
