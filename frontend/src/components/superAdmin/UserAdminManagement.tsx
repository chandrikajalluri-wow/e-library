import React, { useEffect, useState } from 'react';
import { getAllUsers, manageAdmin, deleteUser, revokeUserDeletion } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import { X, Download, RotateCw } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';
import { RoleName } from '../../types/enums';
import { exportUsersToCSV } from '../../utils/csvExport';

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

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="card admin-table-section">
            <div className="admin-table-header-box">
                {!hideTitle && <h3 className="admin-table-title">User & Admin Management</h3>}
                <div className="admin-search-wrapper">
                    <input
                        type="text"
                        placeholder="Search Users..."
                        className="admin-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%' }}
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
                                                        <button onClick={() => confirmAction(user, 'promote')} className="admin-btn-approve">Make Admin</button>
                                                    )}
                                                    {user.role_id?.name === RoleName.ADMIN && (
                                                        <button onClick={() => confirmAction(user, 'demote')} className="admin-btn-reject">Remove Admin</button>
                                                    )}
                                                    {user.deletionScheduledAt ? (
                                                        <button onClick={() => confirmAction(user, 'revoke')} className="admin-btn-approve">Revoke</button>
                                                    ) : (
                                                        <button onClick={() => confirmAction(user, 'delete')} className="admin-btn-delete">Delete</button>
                                                    )}
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
        </div>
    );
};

export default UserAdminManagement;
