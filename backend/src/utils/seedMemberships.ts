import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Membership from '../models/Membership';
import User from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

const memberships = [
    {
        name: 'basic',
        displayName: 'Basic',
        price: 0,
        borrowLimit: 3,
        borrowDuration: 7,
        canRequestBooks: false,
        canAccessPremiumBooks: false,
        canRenewBooks: false,
        hasRecommendations: false,
        description: 'Perfect for casual readers',
        features: [
            'Borrow up to 3 books',
            '7 days borrowing period',
            'Access to standard collection',
            'Email notifications'
        ]
    },
    {
        name: 'standard',
        displayName: 'Standard',
        price: 49,
        borrowLimit: 5,
        borrowDuration: 14,
        canRequestBooks: true,
        canAccessPremiumBooks: false,
        canRenewBooks: false,
        hasRecommendations: false,
        description: 'Great for regular readers',
        features: [
            'Borrow up to 5 books',
            '14 days borrowing period',
            'Access to standard collection',
            'Request new books',
            'Priority email support'
        ]
    },
    {
        name: 'premium',
        displayName: 'Premium',
        price: 99,
        borrowLimit: 10,
        borrowDuration: 21,
        canRequestBooks: true,
        canAccessPremiumBooks: true,
        canRenewBooks: true,
        hasRecommendations: true,
        description: 'Ultimate reading experience',
        features: [
            'Borrow up to 10 books',
            '21 days borrowing period',
            'Access to premium collection',
            'Request new books',
            'Renew borrowed books',
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
        const basicMembership = createdMemberships.find(m => m.name === 'basic');

        if (basicMembership) {
            // Update all users without a membership to basic
            const result = await User.updateMany(
                { membership_id: { $exists: false } },
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
