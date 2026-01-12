import mongoose, { Document, Schema } from 'mongoose';

export interface IMembership extends Document {
    name: string; // 'basic', 'standard', 'premium'
    displayName: string; // 'Basic', 'Standard', 'Premium'
    price: number; // Monthly price in rupees (0 for basic, 49 for standard, 99 for premium)
    borrowLimit: number; // Max books that can be borrowed simultaneously
    borrowDuration: number; // Default borrow duration in days
    canRequestBooks: boolean; // Can request new books
    canAccessPremiumBooks: boolean; // Can access premium collection
    canRenewBooks: boolean; // Can renew borrowed books
    hasRecommendations: boolean; // Gets personalized recommendations
    description: string;
    features: string[]; // List of features for display
    createdAt?: Date;
}

const membershipSchema = new Schema<IMembership>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            enum: ['basic', 'standard', 'premium']
        },
        displayName: { type: String, required: true },
        price: { type: Number, required: true, default: 0 },
        borrowLimit: { type: Number, required: true },
        borrowDuration: { type: Number, required: true },
        canRequestBooks: { type: Boolean, default: false },
        canAccessPremiumBooks: { type: Boolean, default: false },
        canRenewBooks: { type: Boolean, default: false },
        hasRecommendations: { type: Boolean, default: false },
        description: { type: String, required: true },
        features: [{ type: String }],
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model<IMembership>('Membership', membershipSchema);
