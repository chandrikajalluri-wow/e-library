import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Book } from '../types';
import { getCart, syncCart } from '../services/userService';

export interface CartItem {
    book: Book;
    quantity: number;
}

interface BorrowCartContextType {
    cartItems: CartItem[];
    addToCart: (book: Book) => void;
    removeFromCart: (bookId: string) => void;
    increaseQty: (bookId: string) => void;
    decreaseQty: (bookId: string) => void;
    clearCart: () => void;
    isInCart: (bookId: string) => boolean;
    getCartCount: () => number;
    getItemQuantity: (bookId: string) => number;
}

const BorrowCartContext = createContext<BorrowCartContextType | undefined>(undefined);

export const BorrowCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isInitialMount = useRef(true);
    const token = localStorage.getItem('token');
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        try {
            const savedCart = localStorage.getItem('borrowCart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            return [];
        }
    });

    // Load cart from localStorage on initialization
    useEffect(() => {
        const fetchRemoteCart = async () => {
            if (token) {
                try {
                    const remoteCart = await getCart();
                    if (remoteCart && remoteCart.length > 0) {
                        const formattedCart: CartItem[] = remoteCart.map((item: any) => ({
                            book: item.book_id,
                            quantity: item.quantity
                        }));
                        setCartItems(formattedCart);
                    }
                } catch (error) {
                    console.error('Error fetching remote cart:', error);
                }
            }
        };
        fetchRemoteCart();
    }, [token]);

    // Save cart to localStorage and backend whenever it changes
    useEffect(() => {
        // Save to localStorage
        try {
            localStorage.setItem('borrowCart', JSON.stringify(cartItems));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }

        // Sync to backend if logged in (skip initial mount to avoid overwriting remote cart with local on load)
        const syncWithBackend = async () => {
            if (token && !isInitialMount.current) {
                try {
                    await syncCart(cartItems);
                } catch (error) {
                    console.error('Error syncing cart with backend:', error);
                }
            }
        };

        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            syncWithBackend();
        }
    }, [cartItems, token]);

    const addToCart = (book: Book) => {
        setCartItems((prevItems: CartItem[]) => {
            const existingItem = prevItems.find((item: CartItem) => item.book._id === book._id);

            if (existingItem) {
                // Increment quantity if book already in cart (max: available stock)
                if (existingItem.quantity < book.noOfCopies) {
                    return prevItems.map((item) =>
                        item.book._id === book._id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                }
                return prevItems; // Don't add if already at max stock
            }

            // Add new item to cart
            return [...prevItems, { book, quantity: 1 }];
        });
    };

    const removeFromCart = (bookId: string) => {
        setCartItems((prevItems: CartItem[]) => prevItems.filter((item: CartItem) => item.book._id !== bookId));
    };

    const increaseQty = (bookId: string) => {
        setCartItems((prevItems: CartItem[]) =>
            prevItems.map((item: CartItem) => {
                if (item.book._id === bookId && item.quantity < item.book.noOfCopies) {
                    return { ...item, quantity: item.quantity + 1 };
                }
                return item;
            })
        );
    };

    const decreaseQty = (bookId: string) => {
        setCartItems((prevItems: CartItem[]) =>
            prevItems.map((item: CartItem) => {
                if (item.book._id === bookId && item.quantity > 1) {
                    return { ...item, quantity: item.quantity - 1 };
                }
                return item;
            })
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const isInCart = (bookId: string): boolean => {
        return cartItems.some((item) => item.book._id === bookId);
    };

    const getCartCount = (): number => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    };

    const getItemQuantity = (bookId: string): number => {
        const item = cartItems.find((item) => item.book._id === bookId);
        return item ? item.quantity : 0;
    };

    return (
        <BorrowCartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                increaseQty,
                decreaseQty,
                clearCart,
                isInCart,
                getCartCount,
                getItemQuantity,
            }}
        >
            {children}
        </BorrowCartContext.Provider>
    );
};

export const useBorrowCart = () => {
    const context = useContext(BorrowCartContext);
    if (!context) {
        throw new Error('useBorrowCart must be used within a BorrowCartProvider');
    }
    return context;
};
