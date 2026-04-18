const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://asd:aHSpY552Bvo52rVD@cluster0.z56jemc.mongodb.net/');
  const User = mongoose.connection.collection('users');
  const users = await User.find({}).toArray();
  console.log("Users:", users.map(u => `${u.email} (${u.role})`));
  
  const Caregiver = mongoose.connection.collection('caregivers');
  const caregivers = await Caregiver.find({}).toArray();
  console.log("Caregiver Models:", caregivers.map(c => c.email));
  
  const Patient = mongoose.connection.collection('patients');
  const patients = await Patient.find({}).toArray();
  console.log("Patients:", patients.map(p => p.fullName));
  
  process.exit(0);
}
check();
