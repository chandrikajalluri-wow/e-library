export enum RoleName {
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin'
}

export enum MembershipName {
    BASIC = 'basic',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}

export enum BookStatus {
    AVAILABLE = 'available',
    ISSUED = 'issued',
    ARCHIVED = 'archived',
    DAMAGED = 'damaged'
}

export enum BorrowStatus {
    BORROWED = 'borrowed',
    RETURNED = 'returned',
    OVERDUE = 'overdue',
    RETURN_REQUESTED = 'return_requested',
    ARCHIVED = 'archived'
}

export enum NotificationType {
    BORROW = 'borrow',
    RETURN = 'return',
    WISHLIST = 'wishlist',
    FINE = 'fine',
    SYSTEM = 'system'
}

export enum ActivityAction {
    USER_DELETED = 'USER_DELETED',
    ADMIN_MGMT_PROMOTE = 'ADMIN_MGMT_PROMOTE',
    ADMIN_MGMT_DEMOTE = 'ADMIN_MGMT_DEMOTE',
    BOOK_CREATED = 'BOOK_CREATED',
    BOOK_UPDATED = 'BOOK_UPDATED',
    BOOK_DELETED = 'BOOK_DELETED',
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
