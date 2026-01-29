import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
    name: string;
    email: string;
    message: string;
    status: 'OPEN' | 'RESOLVED';
    createdAt: Date;
    updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        message: { type: String, required: true },
        status: {
            type: String,
            enum: ['OPEN', 'RESOLVED'],
            default: 'OPEN'
        }
    },
    { timestamps: true }
);

export default mongoose.model<IContact>('Contact', contactSchema);
