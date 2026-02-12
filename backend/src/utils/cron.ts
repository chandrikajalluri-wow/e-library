import cron from 'node-cron';
import Borrow from '../models/Borrow';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { BorrowStatus, ActivityAction } from '../types/enums';
import { sendEmail } from './mailer';
import Membership from '../models/Membership';
import { MembershipName } from '../types/enums';
import { getMembershipExpiryWarningTemplate, getMembershipExpiredTemplate } from './emailTemplates';
import Readlist from '../models/Readlist';

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
        user.name = 'Deleted User';
        user.email = `deleted_${Date.now()}_${user._id}@example.com`;
        user.password = undefined;
        user.googleId = undefined;
        user.profileImage = undefined;
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.activeSessions = [];
        user.deletionScheduledAt = undefined;

        await user.save();

        await ActivityLog.create({
          action: ActivityAction.USER_DELETED,
          description: `System auto-deactivated user (Scheduled Soft Delete)`,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('Error in deletion cron job:', err);
    }
  });

  // 3. Daily Membership Expiry Check (1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    console.log('Running membership expiry check cron job...');
    try {
      const now = new Date();

      // Calculate warning date (7 days from now)
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 7);
      warningDate.setHours(0, 0, 0, 0);
      const endOfWarningDate = new Date(warningDate);
      endOfWarningDate.setHours(23, 59, 59, 999);

      // 1. Send warning to users expiring in 7 days
      const expiringSoon = await User.find({
        membershipExpiryDate: { $gte: warningDate, $lte: endOfWarningDate }
      }).populate('membership_id');

      for (const user of expiringSoon) {
        const membership = user.membership_id as any;
        if (membership && membership.name === MembershipName.PREMIUM) {
          await sendEmail(
            user.email,
            'Action Required: Your Premium Membership is expiring soon',
            `Hi ${user.name}, your premium membership will expire on ${user.membershipExpiryDate?.toLocaleDateString()}.`,
            getMembershipExpiryWarningTemplate(user.name, user.membershipExpiryDate!)
          );
        }
      }

      // 2. Handle expired memberships
      const basicPlan = await Membership.findOne({ name: MembershipName.BASIC });
      if (!basicPlan) {
        console.error('Basic membership plan not found during cron job');
        return;
      }

      const expiredUsers = await User.find({
        membershipExpiryDate: { $lte: now }
      }).populate('membership_id');

      for (const user of expiredUsers) {
        const membership = user.membership_id as any;
        // Only notify and downgrade if they were premium
        if (membership && membership.name === MembershipName.PREMIUM) {
          await sendEmail(
            user.email,
            'Your Premium Membership has expired',
            `Hi ${user.name}, your premium membership has expired and you have been moved to the Basic plan.`,
            getMembershipExpiredTemplate(user.name)
          );

          user.membership_id = (basicPlan._id as any);
          user.membershipStartDate = undefined;
          user.membershipExpiryDate = undefined;
          await user.save();

          console.log(`Downgraded expired user: ${user.email}`);
        }
      }

    } catch (err) {
      console.error('Error in membership expiry cron job:', err);
    }
  });

  // 4. Daily Readlist Expiry Check (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running readlist expiry check cron job...');
    try {
      const now = new Date();
      const result = await Readlist.updateMany(
        {
          status: 'active',
          dueDate: { $lt: now }
        },
        {
          $set: { status: 'expired' }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Expired ${result.modifiedCount} overdue readlist items.`);
      }
    } catch (err) {
      console.error('Error in readlist expiry cron job:', err);
    }
  });

  console.log('Cron jobs initialized.');
};
