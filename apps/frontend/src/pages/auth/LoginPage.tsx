// ABOUTME: Login page with email/password form and authentication flow
// ABOUTME: Handles user login, error display, and loading state management

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card, CardHeader, CardContent, Alert } from "../../components/common";
import { LoginFormData } from "../../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login({
        email: data.email,
        password: data.password,
      });
      // Navigation will happen automatically via useEffect above
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to login. Please try again.";
      setError(message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-600 text-sm mt-2">
                Sign in to your account to continue
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert
                  variant="error"
                  title="Login Failed"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}

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

              <div className="flex items-end justify-between gap-2">
                <div className="flex-1">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    error={errors.password?.message}
                  />
                </div>
              </div>

              <div className="text-right">
                <a
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full mt-6"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center text-sm text-gray-600">
                <p>
                  Demo credentials:
                  <br />
                  Email: user@example.com
                  <br />
                  Password: password123
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
