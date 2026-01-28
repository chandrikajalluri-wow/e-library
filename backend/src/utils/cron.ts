import cron from 'node-cron';
import Borrow from '../models/Borrow';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { BorrowStatus, ActivityAction } from '../types/enums';
import { sendEmail } from './mailer';

export const initCronJobs = () => {
  // 1. Daily Due Date Reminder (9:00 AM)
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily due date reminder cron job...');
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      targetDate.setHours(0, 0, 0, 0);

      const endOfTargetDate = new Date(targetDate);
      endOfTargetDate.setHours(23, 59, 59, 999);

      const upcomingBorrows = await Borrow.find({
        return_date: {
          $gte: targetDate,
          $lte: endOfTargetDate,
        },
        status: BorrowStatus.BORROWED,
      })
        .populate('user_id', 'email name')
        .populate('book_id', 'title');

      for (const borrow of upcomingBorrows) {
        const user: any = borrow.user_id;
        const book: any = borrow.book_id;
        if (user?.email) {
          await sendEmail(
            user.email,
            'Reminder: Book Return Due Soon',
            `Hi ${user.name},\n\nThis is a reminder that "${book.title}" is due in 2 days.\n\nThank you!`
          );
        }
      }
    } catch (err) {
      console.error('Error in reminder cron job:', err);
    }
  });

  // 2. Daily User Deletion (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled deletion cron job...');
    try {
      const now = new Date();
      const usersToDelete = await User.find({
        deletionScheduledAt: { $lte: now }
      });

      for (const user of usersToDelete) {
        await User.findByIdAndDelete(user._id);
        await ActivityLog.create({
          action: ActivityAction.USER_DELETED,
          description: `System auto-deleted user ${user.email} (Scheduled)`,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('Error in deletion cron job:', err);
    }
  });

  console.log('Cron jobs initialized.');
};
