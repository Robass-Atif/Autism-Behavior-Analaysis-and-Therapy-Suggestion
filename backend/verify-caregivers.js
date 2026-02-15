const mongoose = require('mongoose');

async function verifyCaregivers() {
    try {
        const URI = "mongodb+srv://asd:aHSpY552Bvo52rVD@cluster0.z56jemc.mongodb.net/";
        await mongoose.connect(URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection;

        // Update users collection
        const userResult = await db.collection('users').updateMany(
            { role: 'caregiver' },
            {
                $set: {
                    isEmailVerified: true,
                    accountStatus: 'active'
                }
            }
        );
        console.log(`Updated ${userResult.modifiedCount} users.`);

        // Update caregivers collection
        const caregiverResult = await db.collection('caregivers').updateMany(
            {},
            {
                $set: {
                    isEmailVerified: true,
                    accountStatus: 'active'
                }
            }
        );
        console.log(`Updated ${caregiverResult.modifiedCount} caregivers.`);

        process.exit(0);
    } catch (error) {
        console.error('Error updating caregivers:', error);
        process.exit(1);
    }
}

verifyCaregivers();
