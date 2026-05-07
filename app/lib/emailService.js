// app/lib/emailService.js
import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "accbba2026@gmail.com", // Your Gmail address
    pass: "fpbvhdtnwixrgvtm", // Your Gmail app password
  },
});

export async function sendCredentialsEmail(email, name, password, collegeId) {
  const mailOptions = {
    from: "accbba2026@gmail.com",
    to: email,
    subject: 'Welcome as Class Representative - Department of BBA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2563eb;">Department of BBA</h2>
          <h3 style="color: #4b5563;">Adamjee Cantonment College</h3>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-top: 0;">Welcome to the CR Portal!</h3>
          <p style="color: #4b5563;">Dear <strong>${name}</strong>,</p>
          <p style="color: #4b5563;">You have been appointed as a <strong>Class Representative (CR)</strong> for the Department of BBA.</p>
          <p style="color: #4b5563;">Here are your login credentials to access the CR Management Portal:</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>College ID:</strong> ${collegeId}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</span></p>
          </div>
          
          <p style="color: #4b5563;">Please login using your College ID/Email and the temporary password above.</p>
          <p style="color: #ef4444; font-size: 14px;"><strong>⚠️ Security Note:</strong> For security reasons, please change your password after your first login.</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #9ca3af; font-size: 12px;">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Department of BBA, Adamjee Cantonment College</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Add to app/lib/emailService.js

export async function sendFacultyCredentialsEmail(email, name, password, collegeId) {
  const mailOptions = {
    from: "accbba2026@gmail.com",
    to: email,
    subject: 'Welcome to Faculty Portal - Department of BBA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2563eb;">Department of BBA</h2>
          <h3 style="color: #4b5563;">Adamjee Cantonment College</h3>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h3 style="color: #1f2937;">Welcome to the Faculty Portal!</h3>
          <p>Dear <strong>${name}</strong>,</p>
          <p>You have been added as a faculty member in the Department of BBA.</p>
          <p>Here are your login credentials:</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Faculty ID:</strong> ${collegeId}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
          </div>
          
          <p>Please login using your email and the temporary password above.</p>
          <p style="color: #ef4444; font-size: 14px;"><strong>⚠️ Security Note:</strong> Please change your password after your first login.</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Department of BBA, Adamjee Cantonment College</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendFacultyPasswordUpdateEmail(email, name, newPassword) {
  const mailOptions = {
    from: "accbba2026@gmail.com",
    to: email,
    subject: 'Password Updated - Department of BBA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Department of BBA</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h3>Password Updated</h3>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your faculty portal password has been updated.</p>
          <p><strong>New Password:</strong> <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px;">${newPassword}</span></p>
          <p>Please login with your new password.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password update email:', error);
    return false;
  }
}