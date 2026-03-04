import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Membership from '../models/Membership';
import { RoleName, MembershipName } from '../types/enums';
import Role from '../models/Role';
import connectDB from '../config/db';

dotenv.config();

const createSuperAdmin = async () => {
    try {
        await connectDB();

        const role = await Role.findOne({ name: RoleName.SUPER_ADMIN });
        if (!role) {
            console.error('Super Admin role not found. Please seed roles first.');
            process.exit(1);
        }

        const email = '[EMAIL_ADDRESS]';
        const password = '[PASSWORD]';

        // Check if user exists
        const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User with this email already exists. Updating role...');
            existingUser.role_id = role._id;
            await existingUser.save();
            console.log('User updated to Super Admin.');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({
                name: 'Super Admin',
                email,
                password: hashedPassword,
                role_id: role._id,
                isVerified: true
            });

            await newUser.save();
            console.log('Super Admin created successfully.');
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error creating Super Admin:', error);
        process.exit(1);
    }
};

createSuperAdmin();
