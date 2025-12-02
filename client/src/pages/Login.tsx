import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/providers/AuthProvider";
import LoginForm from "@/components/auth/LoginForm";
import OTPForm from "@/components/auth/OTPForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import logoImage from "@/assets/logo.png";

type AuthStep = "login" | "otp" | "forgot" | "reset";

export default function Login() {
  const [step, setStep] = useState<AuthStep>("login");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Check if there's an intended route to redirect to
      const intendedRoute = localStorage.getItem('intendedRoute');
      if (intendedRoute && intendedRoute !== '/login') {
        localStorage.removeItem('intendedRoute');
        setLocation(intendedRoute);
      } else {
        setLocation("/");
      }
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <img src={logoImage} alt="Vaulted Assets Logo" className="mx-auto w-16 h-16 mb-4" />
          <h2 className="text-3xl font-bold text-gray-800">Vaulted Assets</h2>
          <p className="text-gray-600 mt-2">Admin Portal</p>
        </div>

        {step === "login" && (
          <LoginForm
            onSuccess={() => setStep("otp")}
            onForgotPassword={() => setStep("forgot")}
          />
        )}

        {step === "otp" && (
          <OTPForm
            onSuccess={() => {
              // OTP verification successful - the useEffect will handle redirection
              // when isAuthenticated becomes true
            }}
            onBack={() => setStep("login")}
          />
        )}

        {step === "forgot" && (
          <ForgotPasswordForm
            onSuccess={() => setStep("reset")}
            onBack={() => setStep("login")}
          />
        )}

        {step === "reset" && (
          <ResetPasswordForm
            onSuccess={() => {
              // Password reset successful - redirect back to login
              setStep("login");
            }}
          />
        )}
      </div>
    </div>
  );
}
