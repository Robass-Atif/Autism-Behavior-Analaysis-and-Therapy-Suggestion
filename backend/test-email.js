const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mohammad.abdullah.5434@gmail.com',
    pass: 'jhfrafzxgsnbycud',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.sendMail({
  from: 'mohammad.abdullah.5434@gmail.com',
  to: 'mohammad.abdullah.5434@gmail.com',
  subject: 'Test',
  text: 'Test',
}).then(info => {
  console.log('Success:', info.messageId);
}).catch(err => {
  console.error('Error:', err);
});
