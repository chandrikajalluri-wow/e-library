import React, { useEffect, useState } from "react";
import {
  getProfile,
  updateProfile,
  renewMembership,
} from "../services/userService";
import { cancelMembership } from "../services/membershipService";
import { MembershipName } from '../types/enums';
import { getCategories } from "../services/categoryService";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import "../styles/UserProfile.css";
import type { Category, Membership } from "../types";
import PaymentModal from "../components/PaymentModal";
import CancellationModal from "../components/CancellationModal";

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    favoriteGenres: [] as string[],
    booksRead: 0,
    readingTarget: 0
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isProcessingCancellation, setIsProcessingCancellation] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCategories();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setUser(data);
      setFormData({
        name: data.name,
        phone: data.phone || "",
        favoriteGenres: data.favoriteGenres || [],
        booksRead: data.booksRead || 0,
        readingTarget: data.readingTarget || 0
      });
      setImagePreview(data.profileImage || null);
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load categories");
    }
  };

  const handleGenreToggle = (genreId: string) => {
    setFormData(prev => {
      const isSelected = prev.favoriteGenres.includes(genreId);
      if (isSelected) {
        return {
          ...prev,
          favoriteGenres: prev.favoriteGenres.filter(id => id !== genreId)
        };
      } else {
        if (prev.favoriteGenres.length >= 3) {
          toast.warning("You can only select up to 3 favorite genres");
          return prev;
        }
        return {
          ...prev,
          favoriteGenres: [...prev.favoriteGenres, genreId]
        };
      }
    });
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
      data.append("phone", formData.phone);
      data.append("favoriteGenres", JSON.stringify(formData.favoriteGenres));
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

  const handleCancelMembership = async (reason: string) => {
    try {
      setIsProcessingCancellation(true);
      await cancelMembership(reason);
      toast.success("Membership cancelled successfully");
      setIsCancellationModalOpen(false);
      loadProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to cancel membership");
    } finally {
      setIsProcessingCancellation(false);
    }
  };


  if (!user) return <Loader />;

  return (
    <div className="profile-container dashboard-container">
      <header className="admin-header">
        <div className="admin-header-titles">
          <h1 className="admin-header-title">User Profile</h1>
          <p className="admin-header-subtitle">Manage your personal information and reading goals</p>
        </div>
      </header>

      <div className="profile-main-grid">
        <div className="profile-side">
          <div className="profile-sidebar-sticky">
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

              <div className="membership-status-badge">
                <span className={`badge-plan ${user.membership_id?.name || 'basic'}`}>
                  {user.membership_id?.displayName || 'Basic'} Plan
                </span>
              </div>

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
        </div>

        <div className="profile-content">
          {!isEditing ? (
            <>
              <div className="card profile-card">
                <h2 className="profile-section-title">Reading Preferences</h2>
                <div className="profile-info-grid">
                  <div className="info-item">
                    <label>Favorite Genres</label>
                    <div className="genre-tags-display">
                      {user.favoriteGenres && user.favoriteGenres.length > 0 ? (
                        user.favoriteGenres.map((gId: string) => {
                          const cat = categories.find(c => c._id === gId);
                          return cat ? <span key={gId} className="genre-tag">{cat.name}</span> : null;
                        })
                      ) : (
                        <p>Not set</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card profile-card membership-details-card">
                <h2 className="profile-section-title">Membership Details</h2>
                <div className="profile-info-grid">
                  <div className="info-item">
                    <label>Current Plan</label>
                    <p className="highlight-text">{user.membership_id?.displayName || 'Basic'}</p>
                  </div>

                  {user.membership_id?.name !== MembershipName.BASIC && (
                    <>
                      <div className="info-item">
                        <label>Member Since</label>
                        <p>{user.membershipStartDate ? new Date(user.membershipStartDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="info-item">
                        <label>Expires On</label>
                        <p className={user.membershipExpiryDate && new Date(user.membershipExpiryDate) < new Date() ? 'text-danger' : ''}>
                          {user.membershipExpiryDate ? new Date(user.membershipExpiryDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {user.membership_id?.name !== 'basic' && (
                  <div className="membership-actions">
                    {(() => {
                      const expiryDate = user.membershipExpiryDate ? new Date(user.membershipExpiryDate) : null;
                      const daysUntilExpiry = expiryDate
                        ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : null;

                      const canRenew = daysUntilExpiry !== null && daysUntilExpiry <= 7;

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          {canRenew ? (
                            <button
                              className="btn-secondary renew-btn"
                              onClick={() => setIsRenewalModalOpen(true)}
                            >
                              Renew Membership
                            </button>
                          ) : (
                            <p className="text-muted text-small" style={{ fontSize: '0.85rem', margin: 0 }}>
                              Renewal available 7 days before expiry
                            </p>
                          )}
                          <button
                            className="btn-danger-outline cancel-btn"
                            onClick={() => setIsCancellationModalOpen(true)}
                          >
                            Cancel Membership
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {user.membership_id?.name === MembershipName.BASIC && (
                  <div className="upgrade-prompt-mini">
                    <p>Upgrade to Premium to unlock more features!</p>
                  </div>
                )}
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
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="card profile-card">
                <h2 className="profile-section-title">Favorite Genres (Max 3)</h2>
                {user.membership_id?.name === MembershipName.PREMIUM ? (
                  <div className="genre-selection-wrapper">
                    <div className="genre-dropdown-container">
                      <select
                        className="genre-select-dropdown"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleGenreToggle(e.target.value);
                            e.target.value = ""; // Reset dropdown
                          }
                        }}
                        disabled={formData.favoriteGenres.length >= 3}
                      >
                        <option value="">Select a genre...</option>
                        {categories
                          .filter(cat => !formData.favoriteGenres.includes(cat._id))
                          .map(cat => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                      {formData.favoriteGenres.length >= 3 && (
                        <p className="limit-msg text-muted">Limit reached (3 max)</p>
                      )}
                    </div>

                    <div className="selected-genres-tags">
                      {formData.favoriteGenres.map(gId => {
                        const cat = categories.find(c => c._id === gId);
                        if (!cat) return null;
                        return (
                          <div key={gId} className="genre-tag-removable">
                            <span>{cat.name}</span>
                            <button
                              type="button"
                              className="remove-genre-btn"
                              onClick={() => handleGenreToggle(gId)}
                              aria-label={`Remove ${cat.name}`}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="membership-upgrade-prompt">
                    <p>Upgrade to <strong>Premium</strong> to select your favorite genres and get personalized recommendations!</p>
                  </div>
                )}

                <div className="form-group-row" style={{ marginTop: '2rem' }}>
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

      {
        isRenewalModalOpen && user.membership_id && typeof user.membership_id !== 'string' && (
          <PaymentModal
            membership={user.membership_id as Membership}
            onClose={() => setIsRenewalModalOpen(false)}
            onSuccess={() => {
              loadProfile();
              setIsRenewalModalOpen(false);
            }}
            onSubmit={renewMembership}
          />
        )
      }
      {
        isCancellationModalOpen && (
          <CancellationModal
            onClose={() => setIsCancellationModalOpen(false)}
            onConfirm={handleCancelMembership}
            isProcessing={isProcessingCancellation}
          />
        )
      }
    </div>
  );
};

export default UserProfile;
