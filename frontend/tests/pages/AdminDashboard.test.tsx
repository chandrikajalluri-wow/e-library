import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../../src/pages/AdminDashboard';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleName } from '../../src/types/enums';

// Mock services
vi.mock('../../src/services/bookService', () => ({
    getBooks: vi.fn(() => Promise.resolve({ books: [], pages: 1 })),
    getBook: vi.fn(),
    createBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    checkBookDeletionSafety: vi.fn(),
}));

vi.mock('../../src/services/categoryService', () => ({
    getCategories: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/services/userService', () => ({
    getProfile: vi.fn(() => Promise.resolve({ role: RoleName.ADMIN, name: 'Admin User' })),
    getAdminDashboardStats: vi.fn(() => Promise.resolve({
        totalBooks: 100,
        totalUsers: 50,
        totalReads: 500,
        activeReads: 10,
        totalOrders: 30,
        totalRevenue: 1500,
        pendingOrders: 5,
        completedOrders: 25,
        pendingSuggestions: 2,
        mostReadBook: 'Cool Book',
        mostWishlistedBook: 'Popular Book',
        mostActiveUser: 'Active User',
        topBuyer: 'Big Spender',
        totalCategories: 10
    })),
    getAllReadlistEntries: vi.fn(() => Promise.resolve({ readlist: [], pages: 1 })),
    getAllBookRequests: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/services/adminOrderService', () => ({
    getAllOrders: vi.fn(() => Promise.resolve({ orders: [], totalPages: 1 })),
}));

vi.mock('../../src/services/logService', () => ({
    getActivityLogs: vi.fn(() => Promise.resolve({ logs: [], totalPages: 1 })),
}));

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AdminDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderDashboard = (initialEntries = ['/admin-dashboard']) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <AdminDashboard />
            </MemoryRouter>
        );
    };

    it('renders dashboard stats correctly', async () => {
        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
        });

        expect(screen.getByText('100')).toBeInTheDocument(); // totalBooks
        expect(screen.getByText('50')).toBeInTheDocument(); // totalUsers
        expect(screen.getByText('Cool Book')).toBeInTheDocument(); // mostReadBook
    });

    it('renders different tabs based on search params', async () => {
        render(
            <MemoryRouter initialEntries={['/admin-dashboard?tab=books']}>
                <AdminDashboard />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Manage Books')).toBeInTheDocument();
        });

        cleanup(); // Clear previous render

        render(
            <MemoryRouter initialEntries={['/admin-dashboard?tab=categories']}>
                <AdminDashboard />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Manage Categories')).toBeInTheDocument();
        });
    });

    it('shows super admin banner for super admins', async () => {
        const { getProfile } = await import('../../src/services/userService');
        vi.mocked(getProfile).mockResolvedValueOnce({ role: RoleName.SUPER_ADMIN, name: 'Super Admin' });

        renderDashboard(['/admin-dashboard?tab=books']);

        await waitFor(() => {
            expect(screen.getByText(/Super Admin View:/)).toBeInTheDocument();
        });
    });
});
