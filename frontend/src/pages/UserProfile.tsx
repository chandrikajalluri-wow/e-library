import React, { useEffect, useState } from "react";
import {
  getProfile,
  updateProfile,
  renewMembership,
} from "../services/userService";
import { MembershipName } from '../types/enums';
import { getCategories } from "../services/categoryService";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import "../styles/UserProfile.css";
import type { Category, Membership } from "../types";
import PaymentModal from "../components/PaymentModal";
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Trophy,
  Mail,
  Phone,
  ArrowLeft,
  Zap,
  BookOpen,
  BadgeCheck,
  Target,
  Calendar,
  ChevronRight,
  Lock
} from 'lucide-react';

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
  const navigate = useNavigate();

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



  if (!user) return <Loader />;

  const isPremium = user.membership_id?.name === MembershipName.PREMIUM;

  return (
    <div className="profile-container dashboard-container saas-reveal">
      <div className="back-to-catalog-container">
        <button onClick={() => navigate('/books')} className="back-to-catalog-link">
          <ArrowLeft size={18} />
          Back to Catalog
        </button>
      </div>
      <div className="profile-main-grid">
        <div className="profile-side">
          <div className="profile-sidebar-sticky">
            <div className="card profile-card avatar-card">
              <div className="avatar-upload-container">
                <div className={`profile-avatar-large ${isPremium ? 'premium-glow' : ''}`}>
                  <div className="profile-avatar-item">
                    {imagePreview ? (
                      <img src={imagePreview} alt="User Avatar" />
                    ) : (
                      <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                    )}
                  </div>
                  {isEditing && (
                    <label htmlFor="avatar-input" className="avatar-edit-overlay">
                      <Camera size={20} />
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
              <div className="profile-identity">
                <h3 className="profile-user-name">
                  {user.name}
                  {isPremium && <BadgeCheck size={18} className="verified-icon" />}
                </h3>
                <p className="profile-user-email"><Mail size={14} /> {user.email}</p>
                {user.phone && <p className="profile-user-phone"><Phone size={14} /> {user.phone}</p>}
              </div>

              <div className="membership-status-badge">
                <span className={`badge-plan ${user.membership_id?.name || 'basic'}`}>
                  {isPremium && <Zap size={14} fill="currentColor" />}
                  {user.membership_id?.displayName || 'Basic'} Plan
                </span>
              </div>

              {!isEditing && (
                <button className="btn-primary edit-profile-btn" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              )}
            </div>

            <div className="card profile-card quick-stats-card">
              <h4 className="mini-card-title">Activity Snapshot</h4>
              <div className="quick-stats-grid">
                <div className="q-stat">
                  <BookOpen size={20} className="q-icon" />
                  <div className="q-info">
                    <span className="q-value">{user.booksRead || 0}</span>
                    <span className="q-label">Books Read</span>
                  </div>
                </div>
                <div className="q-stat">
                  <Target size={20} className="q-icon" />
                  <div className="q-info">
                    <span className="q-value">{user.readingTarget || 0}</span>
                    <span className="q-label">Yearly Goal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-content">
          {!isEditing ? (
            <>
              {/* Reading Progress Card */}
              <div className="card profile-card goal-progress-card">
                <div className="goal-header">
                  <div className="goal-title-group">
                    <Trophy size={24} className="goal-icon" />
                    <div>
                      <h2 className="profile-section-title">Reading Goal 2026</h2>
                      <p className="goal-subtitle">You are doing great! Keep it up.</p>
                    </div>
                  </div>
                  <div className="goal-percentage">
                    {user.readingTarget > 0
                      ? `${Math.round((user.booksRead / user.readingTarget) * 100)}%`
                      : '0%'}
                  </div>
                </div>

                <div className="reading-progress-container">
                  <div className="progress-stats-labels">
                    <span>{user.booksRead || 0} books completed</span>
                    <span>Target: {user.readingTarget || 0} books</span>
                  </div>
                  <div className="modern-progress-track">
                    <div
                      className={`modern-progress-fill ${isPremium ? 'premium-gradient' : ''}`}
                      style={{ width: `${Math.min((user.booksRead / user.readingTarget) * 100, 100)}%` }}
                    >
                      <div className="progress-shimmer"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card profile-card categories-card">
                <div className="card-header-flex">
                  <h2 className="profile-section-title">Reading Preferences</h2>
                  {!isPremium && <div className="premium-lock-tag"><Lock size={12} /> Premium Only</div>}
                </div>
                <div className="profile-info-grid">
                  <div className="info-item full-width">
                    <label>Favorite Genres</label>
                    <div className="genre-tags-display">
                      {user.favoriteGenres && user.favoriteGenres.length > 0 ? (
                        user.favoriteGenres.map((gId: string) => {
                          const cat = categories.find(c => c._id === gId);
                          return cat ? <span key={gId} className="genre-tag">{cat.name}</span> : null;
                        })
                      ) : (
                        <p className="not-set-text">{isPremium ? "No genres selected yet." : "Upgrade to Premium to unlock."}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card profile-card membership-details-card">
                <div className="card-header-flex">
                  <h2 className="profile-section-title">Membership Status</h2>
                </div>

                <div className="membership-info-grid">
                  <div className="m-info-box main-plan">
                    <label>Current Plan</label>
                    <div className="plan-display-group">
                      <p className="highlight-text">{user.membership_id?.displayName || 'Basic'}</p>
                      {isPremium && <span className="active-glow">Active</span>}
                    </div>
                  </div>

                  <div className="m-info-mini-grid">
                    <div className="m-mini-box">
                      <div className="m-mini-icon"><BookOpen size={16} /></div>
                      <div className="m-mini-text">
                        <label>Monthly Reading Limit</label>
                        <p>{user.membership_id?.monthlyLimit || 3} Books</p>
                      </div>
                    </div>
                    <div className="m-mini-box">
                      <div className="m-mini-icon"><Calendar size={16} /></div>
                      <div className="m-mini-text">
                        <label>Access Duration</label>
                        <p>{user.membership_id?.accessDuration || 7} Days</p>
                      </div>
                    </div>
                  </div>

                  {user.membership_id?.name && user.membership_id.name !== MembershipName.BASIC && (
                    <div className="membership-dates-footer">
                      <div className="date-item">
                        <label>Member Since</label>
                        <p>{user.membershipStartDate ? new Date(user.membershipStartDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="date-item">
                        <label>Valid Until</label>
                        <p className={user.membershipExpiryDate && new Date(user.membershipExpiryDate) < new Date() ? 'text-danger' : ''}>
                          {user.membershipExpiryDate ? new Date(user.membershipExpiryDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {user.membership_id?.name && user.membership_id.name !== MembershipName.BASIC && (
                  <div className="membership-actions-premium">
                    <div className="m-actions-wrap">
                      <button
                        className="btn-premium-action renew"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setIsRenewalModalOpen(true);
                        }}
                      >
                        Renew Membership
                      </button>
                    </div>
                  </div>
                )}

                {user.membership_id?.name === MembershipName.BASIC && (
                  <div className="upgrade-premium-banner">
                    <div className="u-content">
                      <Zap size={24} className="u-icon" />
                      <div>
                        <h4>Unlock Premium Potential</h4>
                        <p>Unlimited genres, personalized AI recs, and higher limits.</p>
                      </div>
                    </div>
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="profile-form-main">
              <div className="card profile-card">
                <h2 className="profile-section-title">General Information</h2>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="premium-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      className="premium-input"
                      placeholder="+91 00000 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="card profile-card">
                <h2 className="profile-section-title">Reading Goals & Preferences</h2>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Books Read (Automated)</label>
                    <div className="automated-count-display">
                      <BookOpen size={16} />
                      <span>{formData.booksRead}</span>
                    </div>
                    <p className="field-hint">Calculated from finished books in your readlist.</p>
                  </div>
                  <div className="form-group">
                    <label>Reading Target (Yearly)</label>
                    <input
                      type="number"
                      className="premium-input"
                      value={formData.readingTarget}
                      onChange={(e) => setFormData({ ...formData, readingTarget: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="genre-edit-section">
                  <label className="form-label-large">Favorite Genres (Max 3)</label>
                  {isPremium ? (
                    <div className="genre-selection-wrapper">
                      <div className="genre-dropdown-container">
                        <select
                          className="genre-select-dropdown premium-select"
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
                </div>

                <div className="profile-form-actions-container">
                  <button type="submit" className="btn-save-profile">Save Changes</button>
                  <button type="button" className="btn-cancel-profile" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
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
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSubmit={renewMembership}
          />
        )
      }
    </div>
  );
};

export default UserProfile;
