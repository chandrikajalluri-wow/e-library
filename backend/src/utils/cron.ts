/* eslint-disable @typescript-eslint/no-explicit-any */
import cron from 'node-cron';
import Borrow from '../models/Borrow';
import { BorrowStatus } from '../types/enums';
import { sendEmail } from './mailer';

export const initCronJobs = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily due date reminder cron job...');

    try {
      // Target date: 2 days from now
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      targetDate.setHours(0, 0, 0, 0);

      const endOfTargetDate = new Date(targetDate);
      endOfTargetDate.setHours(23, 59, 59, 999);

      // Find borrows due on the target date that are not yet returned
      const upcomingBorrows = await Borrow.find({
        return_date: {
          $gte: targetDate,
          $lte: endOfTargetDate,
        },
        status: BorrowStatus.BORROWED,
      })
        .populate('user_id', 'email name')
        .populate('book_id', 'title');

      console.log(`Found ${upcomingBorrows.length} borrows due in 2 days.`);

      for (const borrow of upcomingBorrows) {
        const user: any = borrow.user_id;
        const book: any = borrow.book_id;

        if (user && user.email) {
          const subject = 'Reminder: Book Return Due Soon';
          const text = `Hi ${user.name},\n\nThis is a reminder that the book "${book.title}" is due to be returned in 2 days (${borrow.return_date.toLocaleDateString()}).\n\nPlease return it on time to avoid fines.\n\nThank you,\nLibrary Admin`;

          await sendEmail(user.email, subject, text);
          console.log(`Reminder sent to ${user.email} for "${book.title}"`);
        }
      }
    } catch (err) {
      console.error('Error in cron job:', err);
    }
  });

  console.log('Cron jobs initialized.');
};
