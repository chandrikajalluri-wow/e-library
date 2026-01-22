import cron from 'node-cron';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { ActivityAction } from '../types/enums';

export const initCronJobs = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled deletion cron job...');
        try {
            const now = new Date();
            const usersToDelete = await User.find({
                deletionScheduledAt: { $lte: now }
            });

            if (usersToDelete.length > 0) {
                console.log(`Found ${usersToDelete.length} users scheduled for deletion.`);

                for (const user of usersToDelete) {
                    await User.findByIdAndDelete(user._id);

                    // Log the system action
                    await ActivityLog.create({
                        user_id: user._id, // Might need handling if user is hard deleted but log needs reference, usually log keeps ID or null
                        action: ActivityAction.USER_DELETED,
                        description: `System auto-deleted user ${user.email} (Scheduled)`,
                        timestamp: new Date()
                    });
                }
                console.log('Scheduled deletions completed.');
            } else {
                console.log('No users scheduled for deletion.');
            }
        } catch (err) {
            console.error('Error in scheduled deletion cron job:', err);
        }
    });
};
