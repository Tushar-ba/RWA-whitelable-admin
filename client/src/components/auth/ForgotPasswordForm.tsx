import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordForm as ForgotPasswordFormType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ForgotPasswordFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function ForgotPasswordForm({ onSuccess, onBack }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormType>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: ForgotPasswordFormType) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", data);
      toast({
        title: "Reset email sent",
        description: "Check your email for reset instructions",
      });
      setCountdown(30);
      onSuccess();
    } catch (error) {
      toast({
        title: "Email not found",
        description: "Please check your email address",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <Key className="h-12 w-12 text-brand-brown" />
        </div>
        <CardTitle className="text-2xl text-center">Forgot Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email to receive reset instructions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@vaultedassets.com"
              {...register("email")}
              className="focus:ring-2 focus:ring-brand-gold focus:border-transparent"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-brown hover:bg-brand-brown/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Email
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={onBack}
              className="text-brand-gold hover:text-brand-brown text-sm font-medium"
            >
              Back to Login
            </button>
            
            {countdown > 0 && (
              <div className="text-sm text-gray-500">
                Resend available in {countdown} seconds
              </div>
            )}
            
            {countdown === 0 && (
              <div>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-brand-gold hover:text-brand-brown text-sm font-medium"
                >
                  Send Again
                </button>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
