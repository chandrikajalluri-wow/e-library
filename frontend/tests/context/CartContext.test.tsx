import { render, screen, act } from '@testing-library/react';
import { CartProvider, useCart } from '../../src/context/CartContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Book } from '../../src/types';
import { BookStatus } from '../../src/types/enums';

// Mock the services
vi.mock('../../src/services/userService', () => ({
    getCart: vi.fn(),
    syncCart: vi.fn(),
}));

const mockBook: Book = {
    _id: '1',
    title: 'Test Book',
    author: 'Test Author',
    price: 10,
    status: BookStatus.AVAILABLE,
    noOfCopies: 5,
    description: 'Test Description',
    isbn: '123',
    category_id: { _id: 'cat1', name: 'Test Category', description: 'Test Cat Description' },
    language: 'English',
    isPremium: false,
    cover_image_url: 'test.jpg'
};

const TestComponent = () => {
    const { cartItems, addToCart, removeFromCart, getCartCount, getItemQuantity } = useCart();
    return (
        <div>
            <span data-testid="cart-count">{getCartCount()}</span>
            <span data-testid="item-quantity">{getItemQuantity('1')}</span>
            <button onClick={() => addToCart(mockBook)}>Add to Cart</button>
            <button onClick={() => removeFromCart('1')}>Remove from Cart</button>
            <div data-testid="cart-items">
                {cartItems.map(item => (
                    <div key={item.book._id} data-testid={`cart-item-${item.book._id}`}>
                        {item.book.title} - {item.quantity}
                    </div>
                ))}
            </div>
        </div>
    );
};

describe('CartContext', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('provides an empty cart by default', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    });

    it('adds an item to the cart', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        const addButton = screen.getByText('Add to Cart');
        act(() => {
            addButton.click();
        });

        expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
        expect(screen.getByTestId('item-quantity')).toHaveTextContent('1');
        expect(screen.getByTestId('cart-item-1')).toHaveTextContent('Test Book - 1');
    });

    it('increases quantity when adding the same item', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        const addButton = screen.getByText('Add to Cart');
        act(() => {
            addButton.click();
            addButton.click();
        });

        expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
        expect(screen.getByTestId('item-quantity')).toHaveTextContent('2');
    });

    it('removes an item from the cart', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        const addButton = screen.getByText('Add to Cart');
        const removeButton = screen.getByText('Remove from Cart');

        act(() => {
            addButton.click();
        });
        expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

        act(() => {
            removeButton.click();
        });
        expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    });

    it('initializes from localStorage', () => {
        const savedCart = [{ book: mockBook, quantity: 2 }];
        localStorage.setItem('cart', JSON.stringify(savedCart));

        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
        expect(screen.getByTestId('item-quantity')).toHaveTextContent('2');
    });

    it('does not exceed stock limit when adding', () => {
        const limitedStockBook = { ...mockBook, noOfCopies: 1 };

        const LocalTestComponent = () => {
            const { addToCart, getItemQuantity } = useCart();
            return (
                <div>
                    <span data-testid="item-quantity">{getItemQuantity('1')}</span>
                    <button onClick={() => addToCart(limitedStockBook)}>Add Limited</button>
                </div>
            );
        };

        render(
            <CartProvider>
                <LocalTestComponent />
            </CartProvider>
        );

        const addButton = screen.getByText('Add Limited');
        act(() => {
            addButton.click();
            addButton.click(); // Should not increase further
        });

        expect(screen.getByTestId('item-quantity')).toHaveTextContent('1');
    });
});
