import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Membership from '../models/Membership';
import { MembershipName } from '../types/enums';
import User from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

const memberships = [
    {
        name: MembershipName.BASIC,
        displayName: 'Basic',
        price: 0,
        monthlyLimit: 3,
        accessDuration: 7,
        canRequestBooks: false,
        canAccessPremiumBooks: false,
        canRenewBooks: false,
        hasRecommendations: false,
        description: 'Perfect for casual readers',
        features: [
            'Read up to 3 books/month',
            '7 days reading period',
            'Access to standard collection',
            '3-4 Days Delivery',
            'No recommendations',
            'Email notifications'
        ]
    },
    {
        name: MembershipName.PREMIUM,
        displayName: 'Premium',
        price: 99,
        monthlyLimit: 10,
        accessDuration: 21,
        canRequestBooks: true,
        canAccessPremiumBooks: true,
        canRenewBooks: true,
        hasRecommendations: true,
        description: 'Ultimate reading experience',
        features: [
            'Read up to 10 books/month',
            '21 days reading period',
            'Access to premium collection',
            '24-Hour Delivery',
            'Request new books',
            'Personalized recommendations',
            'Priority support'
        ]
    }
];

async function seedMemberships() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing memberships
        await Membership.deleteMany({});
        console.log('Cleared existing memberships');

        // Insert new memberships
        const createdMemberships = await Membership.insertMany(memberships);
        console.log('Memberships created:', createdMemberships.length);

        // Get the basic membership ID
        const basicMembership = createdMemberships.find(m => m.name === MembershipName.BASIC);

        if (basicMembership) {
            // Update all users to basic membership to ensure IDs are valid after re-seeding
            const result = await User.updateMany(
                {},
                { $set: { membership_id: basicMembership._id } }
            );
            console.log(`Updated ${result.modifiedCount} users to Basic membership`);
        }

        console.log('Membership seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding memberships:', error);
        process.exit(1);
    }
}

seedMemberships();
