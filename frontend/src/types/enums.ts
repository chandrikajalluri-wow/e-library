export const RoleName = {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
} as const;
export type RoleName = typeof RoleName[keyof typeof RoleName];

export const MembershipName = {
    BASIC: 'basic',
    PREMIUM: 'premium'
} as const;
export type MembershipName = typeof MembershipName[keyof typeof MembershipName];

export const OrderStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURN_REQUESTED: 'return_requested',
    RETURNED: 'returned',
    RETURN_REJECTED: 'return_rejected'
} as const;
export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const BookStatus = {
    AVAILABLE: 'available',
    OUT_OF_STOCK: 'issued',
    ARCHIVED: 'archived',
    DAMAGED: 'damaged'
} as const;
export type BookStatus = typeof BookStatus[keyof typeof BookStatus];

export const BorrowStatus = {
    BORROWED: 'borrowed',
    RETURNED: 'returned',
    OVERDUE: 'overdue',
    RETURN_REQUESTED: 'return_requested',
    ARCHIVED: 'archived'
} as const;
export type BorrowStatus = typeof BorrowStatus[keyof typeof BorrowStatus];

export const NotificationType = {
    BORROW: 'borrow',
    RETURN: 'return',
    WISHLIST: 'wishlist',
    FINE: 'fine',
    SYSTEM: 'system'
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const RequestStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
} as const;
export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

export const AnnouncementType = {
    INFO: 'INFO',
    OFFER: 'OFFER',
    GREETING: 'GREETING',
    MAINTENANCE: 'MAINTENANCE',
    WARNING: 'WARNING'
} as const;
export type AnnouncementType = typeof AnnouncementType[keyof typeof AnnouncementType];

export const TargetPage = {
    ALL: 'ALL',
    HOME: 'HOME',
    BOOKS: 'BOOKS',
    DASHBOARD: 'DASHBOARD',
    PROFILE: 'PROFILE'
} as const;
export type TargetPage = typeof TargetPage[keyof typeof TargetPage];
