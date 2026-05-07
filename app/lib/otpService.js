// app/lib/otpService.js
import otpGenerator from 'otp-generator';

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();
const verifiedStore = new Map(); // Store verified identifiers separately

// Generate and store OTP
export function generateAndStoreOTP(identifier) {
  // Generate 6-digit OTP
  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  // Store OTP with expiration
  otpStore.set(identifier, {
    otp,
    expiresAt,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  
  // Clear any existing verified status
  verifiedStore.delete(identifier);
  
  console.log(`✅ OTP generated for ${identifier}: ${otp} (expires at ${new Date(expiresAt).toLocaleTimeString()})`);
  console.log(`Current store size: ${otpStore.size}`);
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    if (otpStore.has(identifier)) {
      console.log(`🗑️ Auto-cleaning OTP for ${identifier}`);
      otpStore.delete(identifier);
    }
    verifiedStore.delete(identifier);
  }, 5 * 60 * 1000);
  
  return otp;
}

// Verify OTP (first step - just verification, not password reset)
export function verifyOTP(identifier, userOTP) {
  console.log(`🔍 Verifying OTP for ${identifier}, provided OTP: ${userOTP}`);
  console.log(`Current store keys:`, Array.from(otpStore.keys()));
  
  const storedData = otpStore.get(identifier);
  
  if (!storedData) {
    console.log(`❌ No OTP found for identifier: ${identifier}`);
    return { valid: false, message: 'OTP expired or not found. Please request a new OTP.' };
  }
  
  console.log(`Stored OTP: ${storedData.otp}, expires at: ${new Date(storedData.expiresAt).toLocaleTimeString()}`);
  
  if (storedData.expiresAt < Date.now()) {
    console.log(`❌ OTP expired for ${identifier}`);
    otpStore.delete(identifier);
    return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
  }
  
  if (storedData.attempts >= 3) {
    console.log(`❌ Too many failed attempts for ${identifier}`);
    otpStore.delete(identifier);
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  if (storedData.otp !== userOTP) {
    storedData.attempts++;
    console.log(`❌ Invalid OTP for ${identifier}. Attempts: ${storedData.attempts}`);
    return { valid: false, message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.` };
  }
  
  // OTP is valid - store verified status but KEEP the OTP for reset step
  console.log(`✅ OTP verified successfully for ${identifier}`);
  
  // Store verified status (valid for 10 minutes)
  verifiedStore.set(identifier, {
    verified: true,
    verifiedAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes to reset password
    otp: storedData.otp, // Keep OTP reference
  });
  
  // Don't delete OTP yet, keep it for the reset step
  // But mark it as verified in the store
  storedData.verified = true;
  
  return { valid: true, message: 'OTP verified successfully' };
}

// Check if OTP is verified (for reset step)
export function isVerified(identifier) {
  const verified = verifiedStore.get(identifier);
  if (!verified) return false;
  if (verified.expiresAt < Date.now()) {
    verifiedStore.delete(identifier);
    return false;
  }
  return true;
}

// Reset password and clear verification
export function clearVerification(identifier) {
  console.log(`🗑️ Clearing verification for ${identifier}`);
  verifiedStore.delete(identifier);
  otpStore.delete(identifier); // Also delete OTP after successful reset
}

// Resend OTP (reset attempts)
export function resendOTP(identifier) {
  console.log(`🔄 Resending OTP for ${identifier}`);
  if (otpStore.has(identifier)) {
    otpStore.delete(identifier);
  }
  verifiedStore.delete(identifier);
  return generateAndStoreOTP(identifier);
}

// Get store info for debugging
export function getOTPStoreInfo() {
  return {
    size: otpStore.size,
    verifiedSize: verifiedStore.size,
    keys: Array.from(otpStore.keys()),
    verifiedKeys: Array.from(verifiedStore.keys()),
    entries: Array.from(otpStore.entries()).map(([key, value]) => ({
      identifier: key,
      otp: value.otp,
      expiresAt: new Date(value.expiresAt).toLocaleTimeString(),
      attempts: value.attempts,
      verified: value.verified || false,
    })),
  };
}