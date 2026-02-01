import mongoose, { Document, Schema } from 'mongoose';
import { MembershipName } from '../types/enums';

export interface IMembership extends Document {
    name: MembershipName;
    displayName: string; // 'Basic', 'Premium'
    price: number; // Monthly price in rupees (0 for basic, 99 for premium)
    borrowLimit: number; // Max books that can be borrowed simultaneously
    borrowDuration: number; // Default borrow duration in days
    canRequestBooks: boolean; // Can request new books
    canAccessPremiumBooks: boolean; // Can access premium collection
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
            enum: Object.values(MembershipName)
        },
        displayName: { type: String, required: true },
        price: { type: Number, required: true, default: 0 },
        borrowLimit: { type: Number, required: true },
        borrowDuration: { type: Number, required: true },
        canRequestBooks: { type: Boolean, default: false },
        canAccessPremiumBooks: { type: Boolean, default: false },
        hasRecommendations: { type: Boolean, default: false },
        description: { type: String, required: true },
        features: [{ type: String }],
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Add indexes for optimized queries
membershipSchema.index({ price: 1 }); // For sorting by price in getAllMemberships
membershipSchema.index({ name: 1 });  // For lookups by membership name

export default mongoose.model<IMembership>('Membership', membershipSchema);
