import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { getProfile } from '../services/userService';
import { RoleName } from '../types/enums';

interface User {
    _id: string;
    name: string;
    email: string;
    role: RoleName;
    profileImage?: string;
    streakCount?: number;
    [key: string]: any;
}

interface AuthState {
    user: User | null;
    token: string | null;
    role: RoleName | null;
    isLoading: boolean;
    error: string | null;
}

type AuthAction =
    | { type: 'AUTH_START' }
    | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; role: RoleName } }
    | { type: 'AUTH_ERROR'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'UPDATE_USER'; payload: User }
    | { type: 'FINISH_LOADING' };

interface AuthContextType extends AuthState {
    login: (userData: { user: User; token: string; role: RoleName }) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const initialState: AuthState = {
    user: null,
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role') as RoleName | null,
    isLoading: true,
    error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'AUTH_START':
            return { ...state, isLoading: true, error: null };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                isLoading: false,
                user: action.payload.user,
                token: action.payload.token,
                role: action.payload.role,
                error: null,
            };
        case 'AUTH_ERROR':
            return { ...state, isLoading: false, error: action.payload };
        case 'LOGOUT':
            return { ...initialState, token: null, role: null, isLoading: false };
        case 'UPDATE_USER':
            return { ...state, user: action.payload };
        case 'FINISH_LOADING':
            return { ...state, isLoading: false };
        default:
            return state;
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role') as RoleName;
            const userId = localStorage.getItem('userId');

            if (token && userId) {
                try {
                    const profile = await getProfile();
                    dispatch({
                        type: 'AUTH_SUCCESS',
                        payload: { user: profile, token, role }
                    });
                } catch (err) {
                    console.error('Auth initialization failed', err);
                    // If profile fetch fails, token might be invalid/expired
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('userId');
                    dispatch({ type: 'LOGOUT' });
                }
            } else {
                dispatch({ type: 'FINISH_LOADING' });
            }
        };

        initAuth();
    }, []);

    const login = (userData: { user: User; token: string; role: RoleName }) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('userId', userData.user._id);
        dispatch({ type: 'AUTH_SUCCESS', payload: userData });
    };

    const logout = () => {
        const userId = localStorage.getItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        if (userId) {
            localStorage.removeItem(`cart_${userId}`);
        }
        localStorage.removeItem('cart');
        localStorage.removeItem('readlist');
        dispatch({ type: 'LOGOUT' });
    };

    const updateUser = (user: User) => {
        dispatch({ type: 'UPDATE_USER', payload: user });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
