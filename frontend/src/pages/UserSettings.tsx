import React, { useEffect, useState } from "react";
import {
    getProfile,
    updateProfile,
    changePassword,
    getSessions,
    logoutAll
} from "../services/userService";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import ThemeToggle from "../components/ThemeToggle";
import DeleteAccountModal from "../components/DeleteAccountModal";
import "../styles/UserSettings.css";
import "../styles/UserProfile.css"; // Reuse some basic form styles

type SettingsTab = 'public-profile' | 'account' | 'appearance' | 'security' | 'sessions' | 'danger-zone';

const UserSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('public-profile');
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
            setSessions(sessionData.sessions);
            setLastLogin(sessionData.lastLogin);
        } catch (err) {
            toast.error("Failed to load settings data");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append("name", displayName);
            await updateProfile(formData);
            toast.success("Display name updated!");
            loadData();
        } catch (err) {
            toast.error("Failed to update name");
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

    const handleLogoutAll = async () => {
        if (!window.confirm("Are you sure you want to log out from all devices?")) return;
        try {
            await logoutAll();
            toast.success("Logged out from all other devices");
            loadData();
        } catch (err) {
            toast.error("Failed to logout from all devices");
        }
    };


    if (loading) return <Loader />;

    const SidebarItem = ({ tab, label, icon }: { tab: SettingsTab, label: string, icon: React.ReactNode }) => (
        <button
            className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="settings-container saas-reveal">
            <header className="admin-header">
                <h1 className="admin-header-title">Settings</h1>
                <p className="admin-header-subtitle">Manage your personal account and preferences</p>
            </header>

            <div className="settings-layout">
                {/* Left Sidebar */}
                <aside className="settings-sidebar">
                    <nav className="sidebar-nav">
                        <SidebarItem
                            tab="public-profile"
                            label="Public profile"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                        />
                        <SidebarItem
                            tab="account"
                            label="Account"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>}
                        />
                        <SidebarItem
                            tab="appearance"
                            label="Appearance"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
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
                    {activeTab === 'public-profile' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Public profile</h2>
                                <p>This information will be displayed publicly.</p>
                            </div>
                            <form onSubmit={handleUpdateName}>
                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        required
                                    />
                                    <small className="form-help">Your name may appear around Bookstack where you are mentioned.</small>
                                </div>
                                <button type="submit" className="btn-primary">Update Profile</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Account settings</h2>
                                <p>Manage your account credentials and personal information.</p>
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={user?.email} disabled className="disabled-input" />
                                <small className="form-help">Primary email cannot be changed at this time.</small>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="settings-card saas-reveal">
                            <div className="settings-card-header">
                                <h2>Appearance</h2>
                                <p>Customize how Bookstack looks on your device.</p>
                            </div>
                            <div className="preference-item">
                                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Theme preference</label>
                                <div className="theme-toggle-wrapper" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <ThemeToggle />
                                    <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Toggle between Light and Dark mode</span>
                                </div>
                            </div>
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
                                {sessions.map((session, index) => (
                                    <div key={index} className="session-item">
                                        <div className="session-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="3" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /><line x1="7" y1="21" x2="17" y2="21" /></svg>
                                        </div>
                                        <div className="session-details">
                                            <span className="session-device">{session.device.split(')')[0] + ')'}</span>
                                            <span className="session-meta">
                                                {session.location} • Last active: {new Date(session.lastActive).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
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
                                    <button className="btn-danger-outline" onClick={handleLogoutAll}>Log out all</button>
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
            </div>
            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};

export default UserSettings;
