import React, { useEffect, useState } from 'react';
import { getAllUsers, manageAdmin, deleteUser } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import ConfirmationModal from '../ConfirmationModal';

interface User {
    _id: string;
    name: string;
    email: string;
    role_id: { _id: string; name: string };
    membership_id?: { name: string };
    isVerified: boolean;
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

    const handleAction = async () => {
        if (!selectedUser || !modalAction) return;

        try {
            if (modalAction === 'delete') {
                await deleteUser(selectedUser._id);
                toast.success('User deleted successfully');
            } else {
                await manageAdmin(selectedUser._id, modalAction);
                toast.success(`User ${modalAction}d successfully`);
            }
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Action failed');
        } finally {
            setModalOpen(false);
            setSelectedUser(null);
            setModalAction(null);
        }
    };

    const getModalContent = () => {
        if (!selectedUser || !modalAction) return { title: '', message: '', type: 'info' as const };

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
                    title: 'Delete User',
                    message: `Are you sure you want to permanently delete ${selectedUser.name}? This action cannot be undone.`,
                    type: 'danger' as const
                };
            default:
                return { title: '', message: '', type: 'info' as const };
        }
    };

    const modalContent = getModalContent();

    return (
        <div className="card admin-table-section">
            <div className="admin-table-header-box">
                <h3 className="admin-table-title">User & Admin Management</h3>
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
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td><span className="user-main-name">{user.name}</span></td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`status-badge ${user.role_id?.name === 'admin' ? 'status-borrowed' : (user.role_id?.name === 'super_admin' ? 'status-returned' : 'status-pending')}`}>
                                            {user.role_id?.name || 'User'}
                                        </span>
                                    </td>
                                    <td>{user.isVerified ? <span className="status-badge status-available">Verified</span> : <span className="status-badge status-pending">Pending</span>}</td>
                                    <td className="admin-actions-cell">
                                        <div className="admin-actions-flex">
                                            {user.role_id?.name !== 'super_admin' && (
                                                <>
                                                    {user.role_id?.name === 'user' && (
                                                        <button onClick={() => confirmAction(user, 'promote')} className="admin-btn-approve">Make Admin</button>
                                                    )}
                                                    {user.role_id?.name === 'admin' && (
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
                onConfirm={handleAction}
                onCancel={() => setModalOpen(false)}
                confirmText={modalAction === 'delete' ? 'Delete' : 'Confirm'}
            />
        </div>
    );
};

export default UserAdminManagement;
