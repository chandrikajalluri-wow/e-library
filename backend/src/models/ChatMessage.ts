import mongoose, { Document, Schema, Types } from 'mongoose';

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    SYSTEM = 'system'
}

export interface IChatMessage extends Document {
    session_id: Types.ObjectId;
    sender_id: Types.ObjectId;
    content: string;
    messageType: MessageType;
    isRead: boolean;
    createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
    {
        session_id: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true },
        sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        messageType: {
            type: String,
            enum: Object.values(MessageType),
            default: MessageType.TEXT
        },
        isRead: { type: Boolean, default: false }
    },
    { timestamps: true, collection: 'chat_messages' }
);

export default mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
