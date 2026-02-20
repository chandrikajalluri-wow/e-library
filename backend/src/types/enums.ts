export enum RoleName {
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin'
}

export enum MembershipName {
    BASIC = 'basic',
    PREMIUM = 'premium'
}

export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    RETURN_REQUESTED = 'return_requested',
    RETURN_ACCEPTED = 'return_accepted',
    RETURNED = 'returned',
    RETURN_REJECTED = 'return_rejected',
    REFUND_INITIATED = 'refund_initiated',
    REFUNDED = 'refunded'
}

export enum BookStatus {
    AVAILABLE = 'available',
    OUT_OF_STOCK = 'issued',
    ARCHIVED = 'archived',
    DAMAGED = 'damaged'
}

export enum NotificationType {
    BORROW = 'borrow',
    RETURN = 'return',
    WISHLIST = 'wishlist',
    ORDER = 'order',
    BOOK_REQUEST = 'book_request',
    SYSTEM = 'system',
    STOCK_ALERT = 'stock_alert'
}

export enum InviteStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
}

export enum ActivityAction {
    USER_DELETED = 'USER_DELETED',
    ADMIN_MGMT_PROMOTE = 'ADMIN_MGMT_PROMOTE',
    ADMIN_MGMT_DEMOTE = 'ADMIN_MGMT_DEMOTE',
    ADMIN_INVITE_SENT = 'ADMIN_INVITE_SENT',
    ADMIN_INVITE_ACCEPTED = 'ADMIN_INVITE_ACCEPTED',
    BOOK_CREATED = 'BOOK_CREATED',
    BOOK_UPDATED = 'BOOK_UPDATED',
    BOOK_DELETED = 'BOOK_DELETED',
    USER_UPDATED = 'USER_UPDATED',
    MEMBERSHIP_CANCELLED = 'MEMBERSHIP_CANCELLED',
    CATEGORY_CREATED = 'CATEGORY_CREATED',
    CATEGORY_UPDATED = 'CATEGORY_UPDATED',
    CATEGORY_DELETED = 'CATEGORY_DELETED',
    ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
    BOOK_REQUEST_STATUS_UPDATED = 'BOOK_REQUEST_STATUS_UPDATED',
    EXCHANGE_REQUEST_UPDATED = 'EXCHANGE_REQUEST_UPDATED',
    USER_LOGIN = 'USER_LOGIN',
    USER_REGISTERED = 'USER_REGISTERED',
    MEMBERSHIP_UPGRADED = 'MEMBERSHIP_UPGRADED',
    REVIEW_REPORTED = 'REVIEW_REPORTED',
    CONTACT_FORM_SUBMITTED = 'CONTACT_FORM_SUBMITTED',
}

export enum UserTheme {
    LIGHT = 'light',
    DARK = 'dark'
}

export enum RequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

export enum AnnouncementType {
    INFO = 'INFO',
    OFFER = 'OFFER',
    GREETING = 'GREETING',
    MAINTENANCE = 'MAINTENANCE',
    WARNING = 'WARNING'
}

export enum TargetPage {
    ALL = 'ALL',
    USER = 'USER',
    HOME = 'HOME',
    BOOKS = 'BOOKS',
    DASHBOARD = 'DASHBOARD',
    PROFILE = 'PROFILE'
}
