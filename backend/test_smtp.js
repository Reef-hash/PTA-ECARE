const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ptaecare@gmail.com',
    pass: 'zrvccswakcpfpjfe'
  }
});
transporter.verify(function(error, success) {
  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});
