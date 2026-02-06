import mongoose, { Document, Schema, Types } from 'mongoose';

export enum SessionStatus {
    OPEN = 'open',
    CLOSED = 'closed',
    IN_PROGRESS = 'in_progress'
}

export interface IChatSession extends Document {
    user_id: Types.ObjectId;
    admin_id?: Types.ObjectId;
    status: SessionStatus;
    lastMessage?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        admin_id: { type: Schema.Types.ObjectId, ref: 'User' },
        status: {
            type: String,
            enum: Object.values(SessionStatus),
            default: SessionStatus.OPEN
        },
        lastMessage: { type: Schema.Types.ObjectId, ref: 'ChatMessage' }
    },
    { timestamps: true }
);

export default mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
