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
  const [formData, setFormData] = useState({
    name: "",
    favoriteBook: "",
    favoriteAuthor: "",
    booksRead: 0,
    readingTarget: 0
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      setFormData({
        name: data.name,
        favoriteBook: data.favoriteBook || "",
        favoriteAuthor: data.favoriteAuthor || "",
        booksRead: data.booksRead || 0,
        readingTarget: data.readingTarget || 0
      });
      setImagePreview(data.profileImage || null);
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("favoriteBook", formData.favoriteBook);
      data.append("favoriteAuthor", formData.favoriteAuthor);
      data.append("booksRead", formData.booksRead.toString());
      data.append("readingTarget", formData.readingTarget.toString());
      if (profileImage) {
        data.append("profileImage", profileImage);
      }

      await updateProfile(data);
      toast.success("Profile updated!");
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwords.newPassword)) {
      return toast.error("Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.");
    }

    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const errorMsg = (err as any).response?.data?.error || "Failed to change password";
      toast.error(errorMsg);
    }
  };

  if (!user) return <Loader />;

  return (
    <div className="profile-container saas-container">
      <header className="admin-header">
        <h1 className="admin-header-title">User Profile</h1>
        <p className="admin-header-subtitle">Manage your personal information and reading goals</p>
      </header>

      <div className="profile-main-grid">
        <div className="profile-side">
          <div className="card profile-card avatar-card">
            <div className="avatar-upload-container">
              <div className="profile-avatar-large">
                {imagePreview ? (
                  <img src={imagePreview} alt="User Avatar" />
                ) : (
                  <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                )}
                {isEditing && (
                  <label htmlFor="avatar-input" className="avatar-edit-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  </label>
                )}
              </div>
              {isEditing && (
                <input
                  type="file"
                  id="avatar-input"
                  className="hidden-input"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              )}
            </div>
            <h3 className="profile-user-name">{user.name}</h3>
            <p className="profile-user-email">{user.email}</p>
            {!isEditing && (
              <button className="btn-primary edit-profile-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>

          <div className="card profile-card stats-mini-card">
            <h4 className="mini-card-title">Reading Velocity</h4>
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-num">{user.booksRead || 0}</span>
                <span className="stat-lab">Read</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{user.readingTarget || 0}</span>
                <span className="stat-lab">Target</span>
              </div>
            </div>
            {user.readingTarget > 0 && (
              <div className="reading-progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((user.booksRead / user.readingTarget) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-content">
          {!isEditing ? (
            <>
              <div className="card profile-card">
                <h2 className="profile-section-title">Reading Preferences</h2>
                <div className="profile-info-grid">
                  <div className="info-item">
                    <label>Favorite Book</label>
                    <p>{user.favoriteBook || "Not set"}</p>
                  </div>
                  <div className="info-item">
                    <label>Favorite Author</label>
                    <p>{user.favoriteAuthor || "Not set"}</p>
                  </div>
                </div>
              </div>

              <div className="card profile-card">
                <h2 className="profile-section-title">Change Password</h2>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Update Password</button>
                </form>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="profile-form-main">
              <div className="card profile-card">
                <h2 className="profile-section-title">General Information</h2>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="card profile-card">
                <h2 className="profile-section-title">Favorites & Stats</h2>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Favorite Book</label>
                    <input
                      type="text"
                      value={formData.favoriteBook}
                      onChange={(e) => setFormData({ ...formData, favoriteBook: e.target.value })}
                      placeholder="e.g. The Great Gatsby"
                    />
                  </div>
                  <div className="form-group">
                    <label>Favorite Author</label>
                    <input
                      type="text"
                      value={formData.favoriteAuthor}
                      onChange={(e) => setFormData({ ...formData, favoriteAuthor: e.target.value })}
                      placeholder="e.g. F. Scott Fitzgerald"
                    />
                  </div>
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Books Read</label>
                    <input
                      type="number"
                      value={formData.booksRead}
                      onChange={(e) => setFormData({ ...formData, booksRead: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Reading Target (Yearly)</label>
                    <input
                      type="number"
                      value={formData.readingTarget}
                      onChange={(e) => setFormData({ ...formData, readingTarget: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="profile-form-actions">
                <button type="submit" className="btn-primary">Save Profile</button>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
