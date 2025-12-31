import React, { useEffect, useState } from "react";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../services/userService";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import "../styles/UserProfile.css";

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setUser(data);
      setName(data.name);
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(name);
      toast.success("Profile updated");
      setIsEditing(false);
      loadProfile();
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    // Password rules validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwords.newPassword)) {
      return toast.error(
        "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character."
      );
    }

    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      const errorMsg =
        (err as any).response?.data?.error || "Failed to change password";
      toast.error(errorMsg);
    }
  };

  if (!user) return <Loader />;

  return (
    <div className="profile-container">
      <header className="admin-header">
        <h1 className="admin-header-title">User Profile</h1>
        <p className="admin-header-subtitle">Manage your personal information and security</p>
      </header>

      <div className="card profile-card">
        <h2 className="profile-section-title">Personal Details</h2>
        {!isEditing ? (
          <div>
            <div className="profile-info-group">
              <p className="profile-detail-row">
                <strong>Name:</strong> {user.name}
              </p>
              <p className="profile-detail-row">
                <strong>Email:</strong> {user.email} (Read-only)
              </p>
            </div>
            <button className="btn-primary" onClick={() => setIsEditing(true)}>
              Edit Name
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="profile-edit-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <p className="profile-email-readonly">
              <strong>Email:</strong> {user.email} (Read-only)
            </p>
            <div className="profile-form-actions">
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card profile-card">
        <h2 className="profile-section-title">Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              required
            />
            <small className="password-hint" style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Minimum 8 characters, at least one uppercase letter, one number, and one special character.
            </small>
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, confirmPassword: e.target.value })
              }
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
