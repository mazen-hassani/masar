// ABOUTME: Forgot password page - initiates password reset flow by email
// ABOUTME: Sends reset link to user's registered email address

import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button, Input, Card, CardHeader, CardContent, Alert } from "../../components/common";
import * as authService from "../../services/authService";

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setSuccess(false);

    try {
      await authService.requestPasswordReset(data.email);
      setSuccess(true);
      reset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send reset email. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
              <p className="text-gray-600 text-sm mt-2">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {success && (
                <Alert
                  variant="success"
                  title="Check Your Email"
                  message="We've sent a password reset link to your email. Please check your inbox and follow the link to reset your password."
                />
              )}

              {error && (
                <Alert
                  variant="error"
                  title="Error"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}

              {!success && (
                <>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    required
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                    error={errors.email?.message}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </>
              )}

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Remember your password?{" "}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
