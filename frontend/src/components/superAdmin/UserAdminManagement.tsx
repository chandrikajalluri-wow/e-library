import React, { useEffect, useState } from 'react';
import { getAllUsers, manageAdmin, deleteUser } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import ConfirmationModal from '../ConfirmationModal';
import { RoleName } from '../../types/enums';

interface User {
    _id: string;
    name: string;
    email: string;
    role_id: { _id: string; name: string };
    membership_id?: { name: string };
    isVerified: boolean;
    deletionScheduledAt?: string; // It comes as string from JSON
}

const UserAdminManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalAction, setModalAction] = useState<'promote' | 'demote' | 'delete' | null>(null);

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

    const confirmAction = (user: User, action: 'promote' | 'demote' | 'delete') => {
        setSelectedUser(user);
        setModalAction(action);
        setModalOpen(true);
    };

    const [conflictData, setConflictData] = useState<{ pendingBorrows: any[], unpaidFines: any[] } | null>(null);

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
                // Keep modal open, but maybe switch content or show secondary modal?
                // Actually, let's just set conflictData. The Modal content logic can adapt.
                return;
            }
            toast.error(err.response?.data?.error || 'Action failed');
            setModalOpen(false); // Close on other errors
        }
    };

    const getModalContent = () => {
        if (!selectedUser || !modalAction) return { title: '', message: '' as React.ReactNode, type: 'info' as const };

        if (conflictData) {
            return {
                title: 'Cannot Delete User (Pending Obligations)',
                message: (
                    <div>
                        <p style={{ marginBottom: '10px' }}>User has active borrows or fines:</p>
                        <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginBottom: '10px', fontSize: '0.9em' }}>
                            {conflictData.pendingBorrows?.map((b, i) => (
                                <li key={`b-${i}`}>Borrowed: <strong>{b.book}</strong> (Due: {new Date(b.dueDate).toLocaleDateString()})</li>
                            ))}
                            {conflictData.unpaidFines?.map((f, i) => (
                                <li key={`f-${i}`}>Fine: <strong>{f.book}</strong> (Amount: ₹{f.amount})</li>
                            ))}
                        </ul>
                        <p className="status-rejected" style={{ fontWeight: 'bold' }}>Do you want to FORCE delete this user immediately?</p>
                    </div>
                ),
                type: 'danger' as const,
                confirmText: 'Force Delete',
                onConfirm: () => handleAction(true) // Call with force=true
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
                    message: `This will schedule ${selectedUser.name} for deletion in 7 days. If they have no pending books/fines.`,
                    type: 'danger' as const
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
                <h3 className="admin-table-title">User & Admin Management</h3>
                <input
                    type="text"
                    placeholder="Search Users..."
                    className="admin-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={fetchUsers} className="admin-refresh-stats-btn" style={{ height: 'auto', padding: '0.5rem 1rem' }}>
                    Refresh
                </button>
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
                                                    <button onClick={() => confirmAction(user, 'delete')} className="admin-btn-delete">Delete</button>
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
