import React, { useEffect, useState } from 'react';
import { getAllUsers, manageAdmin, deleteUser, revokeUserDeletion, getUserDetails } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import { X, Download, RotateCw, Trash2, Undo2, ShieldCheck, ShieldAlert, Eye, Mail, Phone, Calendar, UserCircle, Hash } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';
import { RoleName } from '../../types/enums';
import { exportUsersToCSV } from '../../utils/csvExport';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
    _id: string;
    name: string;
    email: string;
    role_id: { _id: string; name: string };
    membership_id?: { name: string };
    isVerified: boolean;
    deletionScheduledAt?: string; // It comes as string from JSON
}

interface UserAdminManagementProps {
    hideTitle?: boolean;
}

const UserAdminManagement: React.FC<UserAdminManagementProps> = ({ hideTitle = false }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalAction, setModalAction] = useState<'promote' | 'demote' | 'delete' | 'revoke' | null>(null);

    // Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [userDetails, setUserDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const fetchDetailView = async (userId: string) => {
        setDetailsLoading(true);
        setDetailsModalOpen(true);
        try {
            const data = await getUserDetails(userId);
            setUserDetails(data);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to fetch user details');
            setDetailsModalOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const confirmAction = (user: User, action: 'promote' | 'demote' | 'delete' | 'revoke') => {
        setSelectedUser(user);
        setModalAction(action);
        setModalOpen(true);
    };

    const [conflictData, setConflictData] = useState<{ obligations: string[] } | null>(null);

    const handleAction = async (force: boolean = false) => {
        if (!selectedUser || !modalAction) return;

        try {
            if (modalAction === 'delete') {
                await deleteUser(selectedUser._id, force);
                if (force) {
                    toast.success('User permanently deleted');
                } else {
                    toast.success('User scheduled for deletion (7 days)');
                }
            } else if (modalAction === 'revoke') {
                await revokeUserDeletion(selectedUser._id);
                toast.success('User deletion revoked successfully');
            } else {
                await manageAdmin(selectedUser._id, modalAction);
                toast.success(`User ${modalAction}d successfully`);
            }
            fetchUsers();
            setModalOpen(false);
            setConflictData(null);
            setSelectedUser(null);
            setModalAction(null);
        } catch (err: any) {
            if (err.response?.status === 409 && modalAction === 'delete') {
                setConflictData(err.response.data.details);
                return;
            }
            toast.error(err.response?.data?.error || 'Action failed');
            setModalOpen(false);
        }
    };

    const getModalContent = () => {
        if (!selectedUser || !modalAction) return { title: '', message: '' as React.ReactNode, type: 'info' as const };

        if (conflictData) {
            return {
                title: 'Cannot Delete User (Active Obligations)',
                message: (
                    <div>
                        <p style={{ marginBottom: '10px', color: 'var(--error-color)', fontWeight: 600 }}>The following items prevent deletion:</p>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                            {conflictData.obligations?.map((obs, i) => (
                                <li key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    borderRadius: '6px',
                                    marginBottom: '4px',
                                    fontSize: '0.9rem'
                                }}>
                                    <span style={{ color: '#ef4444' }}>•</span> {obs}
                                </li>
                            ))}
                        </ul>

                        <p className="status-rejected" style={{ fontWeight: 'bold', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            Do you want to FORCE delete this user immediately?
                        </p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>
                            This will anonymize the account regardless of the above obligations.
                        </p>
                    </div>
                ),
                type: 'danger' as const,
                confirmText: 'Force Delete',
                onConfirm: () => handleAction(true)
            };
        }

        switch (modalAction) {
            case 'promote':
                return {
                    title: 'Promote to Admin',
                    message: `Are you sure you want to promote ${selectedUser.name} (${selectedUser.email}) to Admin?`,
                    type: 'info' as const
                };
            case 'demote':
                return {
                    title: 'Revoke Admin Access',
                    message: `Are you sure you want to remove Admin privileges from ${selectedUser.name}?`,
                    type: 'warning' as const
                };
            case 'delete':
                return {
                    title: 'Delete User (Safe)',
                    message: `This will schedule ${selectedUser.name} for deletion in 7 days. This action is only allowed if the user has no active premium membership, active reading sessions, or undelivered orders.`,
                    type: 'danger' as const
                };
            case 'revoke':
                return {
                    title: 'Revoke Deletion',
                    message: `Are you sure you want to cancel the scheduled deletion for ${selectedUser.name}?`,
                    type: 'info' as const
                };
            default:
                return { title: '', message: '', type: 'info' as const };
        }
    };

    const modalContent = getModalContent();

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user._id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === 'all' || user.role_id?.name === filterRole;

        return matchesSearch && matchesRole;
    });

    return (
        <div className="card admin-table-section">
            <div className="admin-table-header-box">
                {!hideTitle && <h3 className="admin-table-title">User & Admin Management</h3>}
                <div className="admin-search-filter-group">
                    <div className="admin-search-wrapper">
                        <input
                            type="text"
                            placeholder="Search Users..."
                            className="admin-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className="admin-search-clear-btn"
                                onClick={() => setSearchTerm('')}
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="admin-filter-wrapper">
                        <select
                            className="admin-role-filter-select"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value as any)}
                        >
                            <option value="all">All Roles</option>
                            <option value="user">Users</option>
                            <option value="admin">Admins</option>
                            <option value="super_admin">Super Admins</option>
                        </select>
                    </div>
                </div>
                <div className="admin-header-actions">
                    <button onClick={fetchUsers} className="admin-refresh-stats-btn">
                        <RotateCw size={18} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => exportUsersToCSV(filteredUsers)}
                        className="admin-export-csv-btn"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>
            <div className="admin-table-wrapper">
                {loading ? (
                    <div className="admin-loading-container"><div className="spinner"></div></div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="user-info-box">
                                            <span className="user-main-name">{user.name}</span>
                                            {/* We can check deletionScheduledAt here if it was in the interface */}
                                            {user.deletionScheduledAt && (
                                                <span className="status-badge status-scheduled" style={{ fontSize: '0.6rem', padding: '2px 6px', marginTop: '4px' }}>
                                                    Deletion Scheduled
                                                </span>
                                            )}
                                            <span className="user-id-sub">ID: {user._id}</span>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`status-badge ${user.role_id?.name === RoleName.ADMIN ? 'status-borrowed' : (user.role_id?.name === RoleName.SUPER_ADMIN ? 'status-returned' : 'status-pending')}`}>
                                            {user.role_id?.name || 'User'}
                                        </span>
                                    </td>
                                    <td>{user.isVerified ? <span className="status-badge status-available">Verified</span> : <span className="status-badge status-pending">Pending</span>}</td>
                                    <td className="admin-actions-cell">
                                        <div className="admin-actions-flex">
                                            {user.role_id?.name !== RoleName.SUPER_ADMIN && (
                                                <>
                                                    {user.role_id?.name === RoleName.USER && (
                                                        <button onClick={() => confirmAction(user, 'promote')} className="admin-btn-approve-icon" title="Make Admin">
                                                            <ShieldCheck size={18} />
                                                        </button>
                                                    )}
                                                    {user.role_id?.name === RoleName.ADMIN && (
                                                        <button onClick={() => confirmAction(user, 'demote')} className="admin-btn-reject-icon" title="Remove Admin">
                                                            <ShieldAlert size={18} />
                                                        </button>
                                                    )}
                                                    {user.deletionScheduledAt ? (
                                                        <button onClick={() => confirmAction(user, 'revoke')} className="admin-btn-approve-icon" title="Revoke Deletion">
                                                            <Undo2 size={18} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => confirmAction(user, 'delete')} className="admin-btn-delete-icon" title="Delete User">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => fetchDetailView(user._id)} className="admin-btn-view-icon" title="View Details">
                                                        <Eye size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <ConfirmationModal
                isOpen={modalOpen}
                title={modalContent.title}
                message={modalContent.message}
                type={modalContent.type}
                onConfirm={modalContent.onConfirm || (() => handleAction(false))}
                onCancel={() => { setModalOpen(false); setConflictData(null); }}
                confirmText={modalContent.confirmText || (modalAction === 'delete' ? 'Schedule Delete' : 'Confirm')}
            />

            {/* --- User Details Premium Modal --- */}
            <AnimatePresence>
                {detailsModalOpen && (
                    <div className="user-details-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="user-details-modal-premium"
                        >
                            <button className="details-close-btn" onClick={() => setDetailsModalOpen(false)}>
                                <X size={20} />
                            </button>

                            {detailsLoading ? (
                                <div className="details-loading">
                                    <div className="spinner"></div>
                                    <p>Gathering user intelligence...</p>
                                </div>
                            ) : userDetails && (
                                <div className="details-content-scroll">
                                    {/* Header Section */}
                                    <div className="details-header-section">
                                        <div className="details-avatar-box">
                                            {userDetails.user.profileImage ? (
                                                <img src={userDetails.user.profileImage} alt={userDetails.user.name} />
                                            ) : (
                                                <div className="details-avatar-placeholder">
                                                    {userDetails.user.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="details-main-info">
                                            <h2>{userDetails.user.name}</h2>
                                            <div className="details-role-badge">
                                                <UserCircle size={16} />
                                                <span>{userDetails.user.role_id?.name || 'Customer'}</span>
                                            </div>
                                            <div className={`details-status-pill ${userDetails.user.isVerified ? 'verified' : 'unverified'}`}>
                                                {userDetails.user.isVerified ? 'Active Account' : 'Pending Verification'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="details-grid">
                                        <div className="details-info-card">
                                            <label>EMAIL ADDRESS</label>
                                            <div className="info-value-box">
                                                <Mail size={18} />
                                                <span>{userDetails.user.email}</span>
                                            </div>
                                        </div>
                                        <div className="details-info-card">
                                            <label>PHONE NUMBER</label>
                                            <div className="info-value-box">
                                                <Phone size={18} />
                                                <span>{userDetails.user.phone || 'Not Provided'}</span>
                                            </div>
                                        </div>
                                        <div className="details-info-card">
                                            <label>DATE JOINED</label>
                                            <div className="info-value-box">
                                                <Calendar size={18} />
                                                <span>{new Date(userDetails.user.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer / Meta */}
                                    <div className="details-footer-meta">
                                        <Hash size={14} />
                                        <span>ID: {userDetails.user._id}</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserAdminManagement;
