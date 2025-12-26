import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBooks } from "../services/bookService";
import {
  getProfile,
  updateProfile,
  changePassword,
  requestBook,
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
  const [bookRequest, setBookRequest] = useState({
    title: "",
    author: "",
    reason: "",
  });
  const navigate = useNavigate();

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

  const handleBookRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if book already exists
      const data = await getBooks(`search=${bookRequest.title}&limit=1`);
      if (data.books && data.books.length > 0) {
        const existingBook = data.books.find((b: any) =>
          b.title.toLowerCase() === bookRequest.title.toLowerCase()
        );
        if (existingBook) {
          toast.info(`This book is already available in the library! Redirecting...`);
          navigate(`/books/${existingBook._id}`);
          return;
        }
      }

      await requestBook(bookRequest);
      toast.success("Book request submitted");
      setBookRequest({ title: "", author: "", reason: "" });
    } catch (err) {
      toast.error("Failed to submit request");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (!user) return <Loader />;

  return (
    <div className="profile-container">
      <h1 className="profile-title">User Profile</h1>

      <div className="nav-links">
        <Link to="/dashboard" className="btn-secondary">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="card profile-card">
        <h2 className="profile-section-title">Personal Details</h2>
        {!isEditing ? (
          <div>
            <p className="profile-detail-row">
              <strong>Name:</strong> {user.name}
            </p>
            <p className="profile-detail-row">
              <strong>Email:</strong> {user.email} (Read-only)
            </p>
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

      <div className="card profile-card">
        <h2 className="profile-section-title">Request a New Book</h2>
        <p className="profile-info-text">
          Can't find a book? Suggest it to our library admins.
        </p>
        <form onSubmit={handleBookRequest}>
          <div className="form-group">
            <label>Book Title</label>
            <input
              type="text"
              value={bookRequest.title}
              onChange={(e) =>
                setBookRequest({ ...bookRequest, title: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Author</label>
            <input
              type="text"
              value={bookRequest.author}
              onChange={(e) =>
                setBookRequest({ ...bookRequest, author: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Reason (Optional)</label>
            <textarea
              value={bookRequest.reason}
              onChange={(e) =>
                setBookRequest({ ...bookRequest, reason: e.target.value })
              }
              rows={3}
              className="form-textarea"
            />
          </div>
          <button type="submit" className="btn-primary">
            Submit Request
          </button>
        </form>
      </div>

      <div className="logout-container">
        <button className="btn-secondary btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
