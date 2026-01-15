import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role';
import connectDB from '../config/db';

dotenv.config();

const seedRoles = async () => {
    try {
        await connectDB();

        const roles = [
            { name: 'user', description: 'Regular library user' },
            { name: 'admin', description: 'Library administrator' },
            { name: 'super_admin', description: 'System super administrator with full access' },
        ];

        for (const role of roles) {
            const existingRole = await Role.findOne({ name: role.name });
            if (!existingRole) {
                await Role.create(role);
                console.log(`Role created: ${role.name}`);
            } else {
                console.log(`Role already exists: ${role.name}`);
            }
        }

        console.log('Role seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding roles:', error);
        process.exit(1);
    }
};

seedRoles();
