// ABOUTME: Reset password page - completes password reset flow with token
// ABOUTME: Validates reset token and sets new password

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button, Input, Card, CardHeader, CardContent, Alert } from "../../components/common";
import * as authService from "../../services/authService";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset.");
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError("Reset token is missing. Please request a new password reset.");
      return;
    }

    setError(null);
    setSuccess(false);

    try {
      await authService.resetPassword(token, data.password);
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password. Please try again.";
      setError(message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <Alert
                variant="error"
                title="Invalid Link"
                message="This password reset link is invalid or has expired. Please request a new one."
              />
              <Button
                onClick={() => navigate("/forgot-password")}
                variant="primary"
                className="w-full mt-4"
              >
                Request New Reset Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
              <p className="text-gray-600 text-sm mt-2">
                Enter your new password to regain access to your account
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {success && (
                <Alert
                  variant="success"
                  title="Password Reset Successfully"
                  message="Your password has been reset. You will be redirected to the login page."
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
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    required
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message:
                          "Password must contain uppercase, lowercase, and numbers",
                      },
                    })}
                    error={errors.password?.message}
                    helperText="Min 8 chars, uppercase, lowercase, and number"
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === password || "Passwords do not match",
                    })}
                    error={errors.confirmPassword?.message}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
