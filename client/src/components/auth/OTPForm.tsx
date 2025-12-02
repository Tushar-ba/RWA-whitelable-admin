import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpSchema, type OTPForm as OTPFormType } from "@shared/schema";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Clock } from "lucide-react";

interface OTPFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function OTPForm({ onSuccess, onBack }: OTPFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { verifyOTP, resendOTP } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPFormType>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const onSubmit = async (data: OTPFormType) => {
    setIsLoading(true);
    try {
      await verifyOTP(data.otp);
      toast({
        title: "Verification successful",
        description: "Welcome to the admin portal",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Invalid OTP. Please check your email and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    try {
      await resendOTP();
      setResendTimer(60); // 60 second cooldown
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email",
      });
    } catch (error) {
      toast({
        title: "Resend failed",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-brand-brown" />
        </div>
        <CardTitle className="text-2xl text-center">Two-Factor Authentication</CardTitle>
        <CardDescription className="text-center">
          Enter the 6-digit code sent to your email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              maxLength={6}
              placeholder="000000"
              className="text-center text-2xl tracking-widest focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              {...register("otp")}
            />
            {errors.otp && (
              <p className="text-sm text-red-600">{errors.otp.message}</p>
            )}
            <p className="text-sm text-gray-500 text-center">
              Please check your email for the verification code
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-brown hover:bg-brand-brown/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Continue
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-brand-gold hover:text-brand-brown text-sm font-medium mr-4"
            >
              Back to Login
            </button>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendTimer > 0 || isResending}
              className={`text-sm font-medium inline-flex items-center gap-1 ${
                resendTimer > 0 || isResending 
                  ? "text-gray-400 cursor-not-allowed" 
                  : "text-brand-gold hover:text-brand-brown"
              }`}
            >
              {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
              {resendTimer > 0 ? (
                <>
                  <Clock className="h-3 w-3" />
                  Resend in {resendTimer}s
                </>
              ) : (
                "Resend Code"
              )}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
