import mongoose from 'mongoose';
import User from './models/User';
import Notification from './models/Notification';
import dotenv from 'dotenv';

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to DB');

        const scheduledUsers = await User.find({ deletionScheduledAt: { $exists: true, $ne: null } });
        console.log(`Found ${scheduledUsers.length} users scheduled for deletion:`);
        scheduledUsers.forEach(u => console.log(`- ${u.email}: ${u.deletionScheduledAt}`));

        const recentNotifications = await Notification.find().sort({ timestamp: -1 }).limit(5);
        console.log('\nRecent Notifications:');
        recentNotifications.forEach(n => console.log(`- Type: ${n.type}, Msg: ${n.message}, User: ${n.user_id}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkData();
