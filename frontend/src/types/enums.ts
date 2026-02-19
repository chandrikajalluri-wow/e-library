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



export const NotificationType = {
    WISHLIST: 'wishlist',
    ORDER: 'order',
    BOOK_REQUEST: 'book_request',
    SYSTEM: 'system',
    STOCK_ALERT: 'stock_alert'
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
    USER: 'USER',
    HOME: 'HOME',
    BOOKS: 'BOOKS',
    DASHBOARD: 'DASHBOARD',
    PROFILE: 'PROFILE',
    ADMIN_PANEL: 'ADMIN_PANEL'
} as const;
export type TargetPage = typeof TargetPage[keyof typeof TargetPage];
