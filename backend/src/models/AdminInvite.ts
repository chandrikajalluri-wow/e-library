import mongoose, { Document, Schema, Types } from 'mongoose';
import { InviteStatus } from '../types/enums';
import { IUser } from './User';

export interface IAdminInvite extends Document {
    email: string;
    token_hash: string;
    invited_by: Types.ObjectId | IUser;
    status: InviteStatus;
    expires_at: Date;
    accepted_at?: Date;
    created_at: Date;
}

const adminInviteSchema = new Schema<IAdminInvite>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
            index: true,
        },
        token_hash: {
            type: String,
            required: true,
            unique: true,
            index: true,
            validate: {
                validator: function (v: string) {
                    return v.length === 60 && v.startsWith('$2');
                },
                message: 'Token hash must be a valid bcrypt hash',
            },
        },
        invited_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(InviteStatus),
            default: InviteStatus.PENDING,
            index: true,
        },
        expires_at: {
            type: Date,
            required: true,
            index: true,
            validate: {
                validator: function (v: Date) {
                    return v > new Date();
                },
                message: 'Expiration date must be in the future',
            },
        },
        accepted_at: {
            type: Date,
        },
        created_at: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false, collection: 'admin_invites' }
);

// Compound index to prevent duplicate pending invites for same email
adminInviteSchema.index(
    { email: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: InviteStatus.PENDING },
        name: 'unique_pending_invite_per_email',
    }
);

// Index for cleanup queries
adminInviteSchema.index({ expires_at: 1, status: 1 });

export default mongoose.model<IAdminInvite>('AdminInvite', adminInviteSchema);
