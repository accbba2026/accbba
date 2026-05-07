// app/components/auth/LoginPage.jsx
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Image from "next/image";
import BBALOGO from "../../assets/bbalogo.png";
import ACCLOGO from "../../assets/acclogo.png";
import { FiMail, FiLock, FiAlertCircle, FiArrowLeft } from "react-icons/fi";

export default function LoginPage() {
  const { login } = useAuth();

  // Login state
  const [loginType, setLoginType] = useState("student");
  const [collegeId, setCollegeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCollegeId, setForgotCollegeId] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // OTP state
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("request"); // 'request', 'verify', 'reset'
  const [identifier, setIdentifier] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const loginData = {
      loginType,
      ...(loginType === "student" && { collegeId }),
      ...(loginType === "cr" && { collegeId, password }),
      ...(loginType === "admin" && { email, password }),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("isAuthenticated", "true");
        window.location.href = data.redirect;
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setResetMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginType,
          email: forgotEmail,
          collegeId: forgotCollegeId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIdentifier(data.identifier);
        setStep("verify");
        setResetMessage("OTP sent to your email! Please check your inbox.");
        setResendTimer(60);
      } else {
        setResetMessage(data.message);
      }
    } catch (err) {
      setResetMessage("Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // In LoginPage.jsx - Make sure handleVerifyOTP is not sending newPassword
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setResetMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp,
          loginType,
          // NO newPassword here - this is just verification
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("reset");
        setResetMessage("OTP verified! Please enter your new password.");
      } else {
        setResetMessage(data.message);
      }
    } catch (err) {
      setResetMessage("Failed to verify OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setResetMessage("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters");
      return;
    }

    setResetMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp,
          newPassword,
          loginType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetMessage(
          "Password reset successful! Please login with your new password.",
        );
        setTimeout(() => {
          setShowForgotPassword(false);
          setStep("request");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          setResetMessage("");
          setForgotEmail("");
          setForgotCollegeId("");
        }, 3000);
      } else {
        setResetMessage(data.message);
      }
    } catch (err) {
      setResetMessage("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          loginType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetMessage("New OTP sent to your email!");
        setResendTimer(60);
      } else {
        setResetMessage(data.message);
      }
    } catch (err) {
      setResetMessage("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset forgot password state
  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setStep("request");
    setResetMessage("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotEmail("");
    setForgotCollegeId("");
    setIdentifier("");
    setResendTimer(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        {/* Logos Section */}
        <div className="flex justify-center items-center gap-8 mb-6">
          <div className="relative w-16 h-16">
            <Image
              src={ACCLOGO}
              alt="ACC College Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="relative w-16 h-16">
            <Image
              src={BBALOGO}
              alt="BBA Department Logo"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Header Text */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">
            Department of <span className="text-blue-600">BBA</span>
          </h2>
          <p className="text-gray-500 mt-2">Adamjee Cantonment College</p>
          <div className="h-px bg-gray-200 my-6"></div>
        </div>

        {!showForgotPassword ? (
          // LOGIN FORM
          <>
            {/* Login Type Selector */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLoginType("student")}
                className={`flex-1 py-2 rounded-md transition ${
                  loginType === "student"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setLoginType("cr")}
                className={`flex-1 py-2 rounded-md transition ${
                  loginType === "cr"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                CR
              </button>
              <button
                type="button"
                onClick={() => setLoginType("admin")}
                className={`flex-1 py-2 rounded-md transition ${
                  loginType === "admin"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Admin/Faculty
              </button>
            </div>

            {/* Login Form */}
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {loginType === "student" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    College ID
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    placeholder="Enter your College ID"
                    className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              {loginType === "cr" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      College ID
                    </label>
                    <input
                      type="text"
                      required
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value)}
                      placeholder="Enter your College ID"
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </>
              )}

              {loginType === "admin" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <FiAlertCircle /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Login"
                )}
              </button>

              {(loginType === "cr" || loginType === "admin") && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          // FORGOT PASSWORD - OTP FLOW
          <>
            {/* Back Button */}
            <button
              onClick={resetForgotPassword}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition mb-4"
            >
              <FiArrowLeft /> Back to Login
            </button>

            {/* Step 1: Request OTP */}
            {step === "request" && (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter your {loginType === "cr" ? "College ID" : "email"} to
                    receive OTP
                  </p>
                </div>

                {loginType === "cr" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      College ID
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotCollegeId}
                      onChange={(e) => setForgotCollegeId(e.target.value)}
                      placeholder="Enter your College ID"
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                {resetMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      resetMessage.includes("sent")
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === "verify" && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Verify OTP
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter the 6-digit OTP sent to your email
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-2xl tracking-widest"
                  />
                </div>

                {resetMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      resetMessage.includes("sent") ||
                      resetMessage.includes("verified")
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <button
                  onClick={handleVerifyOTP}
                  disabled={isLoading || !otp}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>

                <div className="text-center">
                  <button
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    {resendTimer > 0
                      ? `Resend OTP in ${resendTimer}s`
                      : "Resend OTP"}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setStep("request");
                    setResetMessage("");
                    setOtp("");
                  }}
                  className="w-full text-gray-600 py-2 rounded-lg hover:text-gray-800 transition text-sm"
                >
                  Back
                </button>
              </div>
            )}

            {/* Step 3: Reset Password */}
            {step === "reset" && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Set New Password
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter your new password
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                {resetMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      resetMessage.includes("successful")
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <button
                  onClick={handleResetPassword}
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  onClick={() => {
                    setStep("verify");
                    setResetMessage("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full text-gray-600 py-2 rounded-lg hover:text-gray-800 transition text-sm"
                >
                  Back
                </button>
              </div>
            )}
          </>
        )}

        <div className="text-center text-xs text-gray-400 mt-4">
          <p>Demo Student IDs: 521017, 521018, 521019, 521020</p>
        </div>
      </div>
    </div>
  );
}
