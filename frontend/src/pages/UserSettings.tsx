import React, { useEffect, useState } from "react";
import {
    getProfile,
    updateProfile,
    changePassword,
    getSessions,
    logoutAll,
    revokeSession
} from "../services/userService";
import { toast } from "react-toastify";
import { Mail, Phone as PhoneIcon, ShieldCheck } from 'lucide-react';
import Loader from "../components/Loader";
import DeleteAccountModal from "../components/DeleteAccountModal";
import ConfirmationModal from "../components/ConfirmationModal";
import "../styles/UserSettings.css";
import "../styles/UserProfile.css"; // Reuse some basic form styles

type SettingsTab = 'profile' | 'account' | 'security' | 'sessions' | 'danger-zone';

const UserSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [user, setUser] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [lastLogin, setLastLogin] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [displayName, setDisplayName] = useState("");
    const [phone, setPhone] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [tokenToRevoke, setTokenToRevoke] = useState<string | null>(null);
    const [isLogoutAllModalOpen, setIsLogoutAllModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [profileData, sessionData] = await Promise.all([
                getProfile(),
                getSessions()
            ]);
            setUser(profileData);
            setDisplayName(profileData.name);
            setPhone(profileData.phone || "");
            setSessions(sessionData.sessions);
            setLastLogin(sessionData.lastLogin);
        } catch (err) {
            toast.error("Failed to load settings data");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append("name", displayName);
            formData.append("phone", phone);
            await updateProfile(formData);
            toast.success("Profile updated!");
            loadData();
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
            toast.success("Password changed successfully");
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            const errorMsg = (err as any).response?.data?.error || "Failed to change password";
            toast.error(errorMsg);
        }
    };

    const handleRevokeSession = async () => {
        if (!tokenToRevoke) return;
        setActionLoading(true);
        try {
            await revokeSession(tokenToRevoke);
            toast.success("Session revoked");
            setIsRevokeModalOpen(false);
            setTokenToRevoke(null);
            loadData();
        } catch (err) {
            toast.error("Failed to revoke session");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        setActionLoading(true);
        try {
            await logoutAll();
            toast.success("Logged out from all other devices");
            setIsLogoutAllModalOpen(false);
            loadData();
        } catch (err) {
            toast.error("Failed to logout from all devices");
        } finally {
            setActionLoading(false);
        }
    };


    if (loading) return <Loader />;

    const SidebarItem = ({ tab, label, icon }: { tab: SettingsTab, label: string, icon: React.ReactNode }) => (
        <button
            className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
        >
            <span className="sidebar-icon-wrapper">{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="settings-container saas-reveal">
            <header className="admin-header">
                <div className="admin-header-titles">
                    <h1 className="admin-header-title">Settings</h1>
                    <p className="admin-header-subtitle">Manage your personal account and preferences</p>
                </div>
            </header>

            <div className="settings-layout">
                {/* Left Sidebar */}
                <aside className="settings-sidebar">
                    <nav className="sidebar-nav">
                        <SidebarItem
                            tab="profile"
                            label="Profile"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                        />
                        <SidebarItem
                            tab="account"
                            label="Account"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>}
                        />

                        <div className="sidebar-divider"></div>

                        <SidebarItem
                            tab="security"
                            label="Password and authentication"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                        />
                        <SidebarItem
                            tab="sessions"
                            label="Sessions"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="3" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /><line x1="7" y1="21" x2="17" y2="21" /></svg>}
                        />

                        <div className="sidebar-divider"></div>

                        <SidebarItem
                            tab="danger-zone"
                            label="Danger Zone"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                        />
                    </nav>
                </aside>

                {/* Right Content Area */}
                <main className="settings-content-area">
                    {activeTab === 'profile' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Profile</h2>
                                <p>Manage how you appear to others in the Bookstack community.</p>
                            </div>

                            <div className="profile-preview-section">
                                <div className="profile-avatar-wrapper">
                                    <div className="profile-avatar-large">
                                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div className="avatar-status-badge"></div>
                                </div>
                                <div className="profile-preview-info">
                                    <h3>{displayName || 'User'}</h3>
                                    <p>{user?.email}</p>
                                    <span className="profile-type-tag">Profile Details</span>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="settings-form">
                                <div className="form-group">
                                    <label>Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Enter your display name"
                                        required
                                    />
                                    <small className="form-help">This name will be visible to other members and in your reviews.</small>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-primary-premium">Update Profile</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Account settings</h2>
                                <p>Manage your account credentials and security contact info.</p>
                            </div>

                            <div className="account-info-banner">
                                <div className="banner-icon-box">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="banner-text">
                                    <h4>Account Verification</h4>
                                    <p>Your account is verified and secure. Use this section to keep your contact details up to date.</p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="settings-form">
                                <div className="form-group">
                                    <label><Mail size={16} /> Email Address</label>
                                    <div className="input-with-status">
                                        <input type="email" value={user?.email} disabled className="disabled-input-premium" />
                                        <span className="status-locked-badge">Primary</span>
                                    </div>
                                    <small className="form-help">Your primary email address is used for all communications and cannot be changed.</small>
                                </div>
                                <div className="form-group">
                                    <label><PhoneIcon size={16} /> Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+91 00000 00000"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="premium-input"
                                    />
                                    <small className="form-help">Used at the time of delivery</small>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-primary-premium">Save Account Changes</button>
                                </div>
                            </form>
                        </div>
                    )}


                    {activeTab === 'security' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Password and authentication</h2>
                                <p>Secure your account with a strong password.</p>
                            </div>
                            <form onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label>Current password</label>
                                    <input
                                        type="password"
                                        value={passwords.currentPassword}
                                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New password</label>
                                    <input
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm new password</label>
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn-primary">Update password</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'sessions' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Sessions</h2>
                                <p>This is a list of devices that have logged into your account. Revoke any sessions that you do not recognize.</p>
                            </div>
                            {lastLogin && (
                                <div className="last-login-info" style={{ marginBottom: '2rem' }}>
                                    <strong>Last active login:</strong> {new Date(lastLogin).toLocaleString()}
                                </div>
                            )}
                            <div className="sessions-list">
                                {sessions.map((session, index) => {
                                    const isCurrentSession = session.token === localStorage.getItem('token');
                                    return (
                                        <div key={index} className={`session-item ${isCurrentSession ? 'current-session' : ''}`}>
                                            <div className="session-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="3" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /><line x1="7" y1="21" x2="17" y2="21" /></svg>
                                            </div>
                                            <div className="session-details">
                                                <div className="session-device-row">
                                                    <span className="session-device">{session.device.split(')')[0] + ')'}</span>
                                                    {isCurrentSession && <span className="current-badge">This device</span>}
                                                </div>
                                                <span className="session-meta">
                                                    {session.location} • Last active: {new Date(session.lastActive).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {!isCurrentSession && (
                                                <button
                                                    className="revoke-session-btn"
                                                    onClick={() => {
                                                        setTokenToRevoke(session.token);
                                                        setIsRevokeModalOpen(true);
                                                    }}
                                                    title="Revoke session"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'danger-zone' && (
                        <div className="settings-card danger-zone saas-reveal">
                            <div className="settings-card-header">
                                <h2 className="danger-title">Danger Zone</h2>
                                <p>Irreversible and destructive actions.</p>
                            </div>
                            <div className="danger-actions-list">
                                <div className="danger-action-item">
                                    <div className="danger-action-info">
                                        <h4>Log out of all devices</h4>
                                        <p>You will be logged out of all other active sessions except this one.</p>
                                    </div>
                                    <button className="btn-danger-outline" onClick={() => setIsLogoutAllModalOpen(true)}>Log out all</button>
                                </div>
                                <div className="danger-action-item">
                                    <div className="danger-action-info">
                                        <h4>Delete account</h4>
                                        <p>Once you delete your account, there is no going back. Please be certain.</p>
                                    </div>
                                    <button className="btn-danger-outline" onClick={() => setIsDeleteModalOpen(true)}>Delete account</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div >
            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
            />

            <ConfirmationModal
                isOpen={isRevokeModalOpen}
                title="Revoke Session"
                message="Are you sure you want to log out from this device? You will need to log in again to access your account from that device."
                onConfirm={handleRevokeSession}
                onCancel={() => {
                    setIsRevokeModalOpen(false);
                    setTokenToRevoke(null);
                }}
                confirmText="Revoke Session"
                type="danger"
                isLoading={actionLoading}
            />

            <ConfirmationModal
                isOpen={isLogoutAllModalOpen}
                title="Logout from All Devices"
                message="Are you sure you want to log out from all other active devices? This will invalidate all sessions except for the one you are currently using."
                onConfirm={handleLogoutAll}
                onCancel={() => setIsLogoutAllModalOpen(false)}
                confirmText="Logout All"
                type="danger"
                isLoading={actionLoading}
            />
        </div >
    );
};

export default UserSettings;
