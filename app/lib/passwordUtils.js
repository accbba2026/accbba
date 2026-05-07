// app/lib/passwordUtils.js
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Generate random password
export function generateRandomPassword(length = 10) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Hash password
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}