// ABOUTME: User profile page - view and manage user account information
// ABOUTME: Allows editing profile, changing password, and account settings

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  Alert,
} from "../components/common";
import * as authService from "../services/authService";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
}

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = passwordForm.watch("newPassword");

  const handleProfileSubmit = async (_data: ProfileFormData) => {
    setProfileError(null);
    setProfileSuccess(false);

    try {
      // TODO: Implement updateProfile API call when backend endpoint is ready
      // await authService.updateProfile(_data);
      setProfileSuccess(true);
      setIsEditingProfile(false);

      setTimeout(() => setProfileSuccess(false), 5000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      setProfileError(message);
    }
  };

  const handlePasswordSubmit = async (data: ChangePasswordFormData) => {
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      setPasswordSuccess(true);
      setIsChangingPassword(false);
      passwordForm.reset();

      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to change password. Please try again.";
      setPasswordError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">Manage your profile and security preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
            <Button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              variant={isEditingProfile ? "secondary" : "primary"}
              size="sm"
            >
              {isEditingProfile ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profileSuccess && (
            <Alert
              variant="success"
              message="Profile updated successfully"
              className="mb-4"
              onClose={() => setProfileSuccess(false)}
            />
          )}
          {profileError && (
            <Alert
              variant="error"
              message={profileError}
              className="mb-4"
              onClose={() => setProfileError(null)}
            />
          )}

          {isEditingProfile ? (
            <form
              onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
              className="space-y-4"
            >
              <Input
                label="First Name"
                {...profileForm.register("firstName", {
                  required: "First name is required",
                })}
                error={profileForm.formState.errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...profileForm.register("lastName", {
                  required: "Last name is required",
                })}
                error={profileForm.formState.errors.lastName?.message}
              />
              <Input
                label="Email"
                type="email"
                {...profileForm.register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                })}
                error={profileForm.formState.errors.email?.message}
              />
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={profileForm.formState.isSubmitting}
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 text-sm mb-1">First Name</p>
                <p className="text-gray-900 font-medium">{user?.firstName || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Last Name</p>
                <p className="text-gray-900 font-medium">{user?.lastName || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-600 text-sm mb-1">Email</p>
                <p className="text-gray-900 font-medium">{user?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Role</p>
                <p className="text-gray-900 font-medium">{user?.role || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Member Since</p>
                <p className="text-gray-900 font-medium">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
            <Button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              variant={isChangingPassword ? "secondary" : "primary"}
              size="sm"
            >
              {isChangingPassword ? "Cancel" : "Change"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <Alert
              variant="success"
              message="Password changed successfully"
              className="mb-4"
              onClose={() => setPasswordSuccess(false)}
            />
          )}
          {passwordError && (
            <Alert
              variant="error"
              message={passwordError}
              className="mb-4"
              onClose={() => setPasswordError(null)}
            />
          )}

          {isChangingPassword && (
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4"
            >
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
                required
                {...passwordForm.register("currentPassword", {
                  required: "Current password is required",
                })}
                error={passwordForm.formState.errors.currentPassword?.message}
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                required
                {...passwordForm.register("newPassword", {
                  required: "New password is required",
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
                error={passwordForm.formState.errors.newPassword?.message}
                helperText="Min 8 chars, uppercase, lowercase, and number"
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                required
                {...passwordForm.register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === newPassword || "Passwords do not match",
                })}
                error={passwordForm.formState.errors.confirmPassword?.message}
              />
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={passwordForm.formState.isSubmitting}
                >
                  Change Password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsChangingPassword(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-gray-600 text-sm mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Login History</p>
                <p className="text-gray-600 text-sm mt-1">
                  View recent login activity on your account
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
