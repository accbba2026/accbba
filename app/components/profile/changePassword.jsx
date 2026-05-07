// app/components/profile/ChangePassword.jsx
"use client";
import React, { useState, useEffect } from "react";
import { FaLock, FaEnvelope, FaKey, FaCheckCircle, FaTimesCircle, FaArrowLeft } from "react-icons/fa";

const ChangePassword = ({ userEmail, userCollegeId, userRole }) => {
  const [step, setStep] = useState("request"); // 'request', 'verify', 'reset'
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // OTP states
  const [otp, setOtp] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  
  // Password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Determine identifier based on user role
  const getIdentifier = () => {
    // For CR, use collegeId; for others, use email
    if (userRole === "cr") {
      return userCollegeId;
    }
    return userEmail;
  };

  const getLoginType = () => {
    if (userRole === "cr") return "cr";
    if (userRole === "admin" || userRole === "faculty") return "admin";
    return "student";
  };

  // Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsLoading(true);

    const loginType = getLoginType();
    const identifierValue = getIdentifier();

    try {
      const response = await fetch("/api/auth/change-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginType,
          email: userEmail,
          collegeId: userCollegeId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIdentifier(data.identifier);
        setStep("verify");
        setMessage({ type: "success", text: "OTP sent to your email! Please check your inbox." });
        setResendTimer(60);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to send OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-change-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp,
          loginType: getLoginType(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("reset");
        setMessage({ type: "success", text: "OTP verified! Please enter your new password." });
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to verify OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    
    setMessage({ type: "", text: "" });
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-change-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp,
          newPassword,
          loginType: getLoginType(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Password changed successfully! Please login again." });
        setTimeout(() => {
          // Reset all states
          setStep("request");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          setIdentifier("");
          setMessage({ type: "", text: "" });
        }, 3000);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to reset password" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/resend-change-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          loginType: getLoginType(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "New OTP sent to your email!" });
        setResendTimer(60);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to resend OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setIdentifier("");
    setMessage({ type: "", text: "" });
    setResendTimer(0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FaLock className="text-blue-600 text-xl" />
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Update your password to keep your account secure
        </p>
      </div>

      <div className="p-6">
        {step === "request" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <FaEnvelope className="inline mr-2" />
               {" We'll send a verification code to your registered email address."}
              </p>
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaKey />
              {isLoading ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                Enter the 6-digit verification code sent to your email.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
              />
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || !otp}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition font-medium disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>

            <div className="text-center">
              <button
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
              </button>
            </div>

            <button
              onClick={resetForm}
              className="w-full text-gray-600 py-2 rounded-lg hover:text-gray-800 transition text-sm flex items-center justify-center gap-2"
            >
              <FaArrowLeft /> Back
            </button>
          </div>
        )}

        {step === "reset" && (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <FaCheckCircle className="inline mr-2" />
                Verification successful! Enter your new password.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {message.text && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleResetPassword}
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition font-medium disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </button>

            <button
              onClick={resetForm}
              className="w-full text-gray-600 py-2 rounded-lg hover:text-gray-800 transition text-sm flex items-center justify-center gap-2"
            >
              <FaArrowLeft /> Back to Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;