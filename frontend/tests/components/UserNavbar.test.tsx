import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserNavbar from '../../src/components/UserNavbar';
import { CartProvider } from '../../src/context/CartContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleName } from '../../src/types/enums';

// Mock services
vi.mock('../../src/services/userService', () => ({
    getProfile: vi.fn(),
    getCart: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/services/authService', () => ({
    logout: vi.fn(),
}));

// Mock NotificationCenter to simplify
vi.mock('../../src/components/NotificationCenter', () => ({
    default: () => <div data-testid="notification-center">Notifications</div>,
}));

// Mock ConfirmationModal
vi.mock('../../src/components/ConfirmationModal', () => ({
    default: ({ isOpen, onConfirm, onCancel }: any) => isOpen ? (
        <div data-testid="confirmation-modal">
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ) : null,
}));

describe('UserNavbar', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    const renderNavbar = (role?: string) => {
        if (role) localStorage.setItem('role', role);
        return render(
            <MemoryRouter>
                <CartProvider>
                    <UserNavbar />
                </CartProvider>
            </MemoryRouter>
        );
    };

    it('renders logo and basic links for guests', () => {
        renderNavbar();
        expect(screen.getByText('Bookstack')).toBeInTheDocument();
        // Target the desktop CTA specifically as there are multiple "Sign In" links
        expect(screen.getByText('Sign In', { selector: '.nav-cta' })).toBeInTheDocument();
    });

    it('renders user specific links when logged in as user', () => {
        localStorage.setItem('userId', 'user123');
        renderNavbar(RoleName.USER);

        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Books')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Wishlist')).toBeInTheDocument();
        expect(screen.getByText('Cart')).toBeInTheDocument();
    });

    it('renders admin specific links when logged in as admin', () => {
        localStorage.setItem('userId', 'admin123');
        renderNavbar(RoleName.ADMIN);

        expect(screen.getByText('Stats')).toBeInTheDocument();
        expect(screen.getByText('Orders')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Exchanges')).toBeInTheDocument();
        expect(screen.getByText('Support')).toBeInTheDocument();
    });

    it('opens and closes the logout modal', async () => {
        localStorage.setItem('userId', 'admin123');
        renderNavbar(RoleName.ADMIN);

        const logoutBtn = screen.getByTitle('Sign Out');
        fireEvent.click(logoutBtn);

        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);

        expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
    });

    it('shows cart count badge', async () => {
        localStorage.setItem('userId', 'user123');
        // Pre-fill cart in localStorage for the provider
        const cartData = [{ book: { _id: '1' }, quantity: 3 }];
        localStorage.setItem('cart_user123', JSON.stringify(cartData));

        // Also mock the remote cart fetch that happens on mount
        const { getCart } = await import('../../src/services/userService');
        (getCart as any).mockResolvedValue([{ book_id: { _id: '1' }, quantity: 3 }]);

        renderNavbar(RoleName.USER);

        await waitFor(() => {
            // Find all cart links and pick the desktop one
            const cartLinks = screen.getAllByRole('link', { name: /cart/i });
            const desktopCartLink = cartLinks.find(el => el.classList.contains('desktop-only'));
            expect(desktopCartLink).toBeInTheDocument();

            const badge = desktopCartLink!.querySelector('.cart-badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent('3');
        });
    });
});
