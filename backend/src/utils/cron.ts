import cron from 'node-cron';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { ActivityAction } from '../types/enums';
import { sendEmail } from './mailer';
import Membership from '../models/Membership';
import { MembershipName } from '../types/enums';
import { getMembershipExpiryWarningTemplate, getMembershipExpiredTemplate } from './emailTemplates';
import Readlist from '../models/Readlist';

export const initCronJobs = () => {
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
