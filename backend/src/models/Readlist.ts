import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReadlist extends Document {
    user_id: Types.ObjectId;
    book_id: Types.ObjectId;
    status: 'active' | 'completed' | 'expired';
    addedAt: Date;
    dueDate?: Date;
    completedAt?: Date;
    last_page: number;
    bookmarks: number[];
    source: 'manual' | 'order';
}

const readlistSchema = new Schema<IReadlist>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
        status: {
            type: String,
            enum: ['active', 'completed', 'expired'],
            default: 'active'
        },
        addedAt: { type: Date, default: Date.now },
        dueDate: { type: Date },
        completedAt: { type: Date },
        last_page: { type: Number, default: 1 },
        bookmarks: { type: [Number], default: [] }
    },
    { timestamps: true, collection: 'read_lists' }
);

// allow multiple records for the same book over time
readlistSchema.index({ user_id: 1, book_id: 1, addedAt: -1 });

export default mongoose.model<IReadlist>('Readlist', readlistSchema);
