import React, { useEffect, useState, useRef } from 'react';
import { getAllUsers, manageAdmin, deleteUser, revokeUserDeletion, getUserDetails, inviteAdmin, inviteAdminByEmail } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import { X, Download, RotateCw, Trash2, Undo2, ShieldCheck, ShieldAlert, Eye, Mail, Phone, Calendar, UserCircle, Hash, Search } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';
import '../../styles/Pagination.css';
import { RoleName } from '../../types/enums';
import { exportUsersToCSV } from '../../utils/csvExport';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/InviteAdminModal.css';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [limit] = useState(15);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalAction, setModalAction] = useState<'promote' | 'demote' | 'delete' | 'revoke' | 'invite' | null>(null);

    // Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [userDetails, setUserDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all');

    // Email Invite Modal State
    const [emailInviteOpen, setEmailInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const tableTopRef = useRef<HTMLDivElement>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const query = `page=${currentPage}&limit=${limit}&search=${searchTerm}&role=${filterRole}`;
            const data = await getAllUsers(query);
            setUsers(data.users);
            setTotalPages(data.totalPages);
            setTotalUsers(data.totalUsers);
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
    }, [currentPage, filterRole]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            fetchUsers();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    useEffect(() => {
        if (currentPage > 1) {
            tableTopRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentPage]);

    const confirmAction = (user: User, action: 'promote' | 'demote' | 'delete' | 'revoke' | 'invite') => {
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
            } else if (modalAction === 'invite') {
                await inviteAdmin(selectedUser._id);
                toast.success(`Admin invitation sent to ${selectedUser.email}`);
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

    const handleEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setInviteLoading(true);
        try {
            await inviteAdminByEmail(inviteEmail);
            toast.success(`Admin invitation sent to ${inviteEmail}`);
            setEmailInviteOpen(false);
            setInviteEmail('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    const getModalContent = () => {
        if (!selectedUser || !modalAction) return { title: '', message: '' as React.ReactNode, type: 'info' as const };

        if (conflictData) {
            return {
                title: 'Cannot Delete User (Active Obligations)',
                message: (
                    <div>
                        <p className="conflict-list-title">The following items prevent deletion:</p>
                        <ul className="deletion-conflict-list">
                            {conflictData.obligations?.map((obs, i) => (
                                <li key={i} className="deletion-conflict-item">
                                    <span className="conflict-bullet">•</span> {obs}
                                </li>
                            ))}
                        </ul>

                        <p className="status-rejected force-delete-warning">
                            Do you want to FORCE delete this user immediately?
                        </p>
                        <p className="force-delete-subtext">
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
            case 'invite':
                return {
                    title: 'Invite as Admin',
                    message: `Send an admin invitation to ${selectedUser.name} (${selectedUser.email})? They will receive an email with a secure link to accept the invitation.`,
                    type: 'info' as const
                };
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



    const filteredUsers = users;

    return (
        <div className="card admin-table-section" ref={tableTopRef}>
            <div className="admin-table-header-box">
                {!hideTitle && <h3 className="admin-table-title">User & Admin Management</h3>}
                <div className="admin-header-actions-unified">
                    <div className="admin-search-wrapper">
                        <Search size={18} className="search-bar-icon" />
                        <input
                            type="text"
                            placeholder="Search Users..."
                            className="admin-search-input-premium"
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
                    <button
                        onClick={() => setEmailInviteOpen(true)}
                        className="admin-invite-trigger-btn"
                    >
                        <ShieldCheck size={20} />
                        Send Admin Invite
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
                                                        <button onClick={() => confirmAction(user, 'invite')} className="admin-btn-approve-icon" title="Invite as Admin">
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

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="admin-pagination" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <div className="pagination-info">
                        <div className="pagination-info-pages">
                            Page <span>{currentPage}</span> of <span>{totalPages}</span>
                        </div>
                        <div className="total-count-mini">Total {totalUsers} users</div>
                    </div>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

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

            {/* --- Email Invite Modal --- */}
            <AnimatePresence>
                {emailInviteOpen && (
                    <div className="user-details-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="admin-invite-modal-container"
                        >
                            <button className="admin-invite-close-button" onClick={() => setEmailInviteOpen(false)}>
                                <X size={24} />
                            </button>

                            <div className="admin-invite-modal-header">
                                <div className="admin-invite-icon-wrapper">
                                    <Mail size={32} />
                                </div>
                                <div className="admin-invite-title-box">
                                    <h2>Send Admin Invite</h2>
                                    <p>Invite anyone to become an admin via email</p>
                                </div>
                            </div>

                            <form onSubmit={handleEmailInvite}>
                                <div className="admin-invite-form-group">
                                    <label>Recipient Email Address</label>
                                    <div className="admin-invite-input-wrapper">
                                        <Mail size={18} style={{ opacity: 0.5, color: '#6366f1' }} />
                                        <input
                                            type="email"
                                            placeholder="enter.email@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="admin-invite-actions">
                                    <button
                                        type="submit"
                                        className="admin-invite-submit-btn"
                                        disabled={inviteLoading}
                                    >
                                        {inviteLoading ? (
                                            <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
                                        ) : (
                                            <>
                                                <ShieldCheck size={20} />
                                                Send Invitation
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEmailInviteOpen(false)}
                                        className="admin-invite-cancel-btn"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserAdminManagement;
