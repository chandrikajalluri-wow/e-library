import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const fixUsers = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || '';
        if (!mongoUri) {
            console.error('MONGO_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const result = await User.updateMany(
            {},
            { $set: { isVerified: true } }
        );

        console.log(`Updated ${result.modifiedCount} users to verified.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixUsers();
