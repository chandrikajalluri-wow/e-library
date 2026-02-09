const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookStack Notification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f7f6;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2c3e50;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 1px;
        }
        .content {
            padding: 30px;
        }
        .footer {
            background-color: #f8f9fa;
            color: #777;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #eee;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3498db;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        .highlight {
            color: #3498db;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BookStack</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BookStack E-Library. All rights reserved.</p>
            <p>You received this email because you are a registered user of BookStack.</p>
        </div>
    </div>
</body>
</html>
`;

export const getVerificationEmailTemplate = (name: string, verifyLink: string) => {
    return getBaseTemplate(`
        <h2>Hello ${name},</h2>
        <p>Welcome to <span class="highlight">BookStack</span>! We're excited to have you on board.</p>
        <p>Before you can start exploring our vast collection of books, please verify your email address by clicking the button below:</p>
        <div style="text-align: center;">
            <a href="${verifyLink}" class="button">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all;"><a href="${verifyLink}">${verifyLink}</a></p>
        <p>Happy reading!<br>The BookStack Team</p>
    `);
};

export const getPasswordResetTemplate = (name: string, resetLink: string) => {
    return getBaseTemplate(`
        <h2>Hello ${name},</h2>
        <p>We received a request to reset your password for your BookStack account.</p>
        <p>Click the button below to set a new password:</p>
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The BookStack Team</p>
    `);
};

export const getOrderStatusUpdateTemplate = (name: string, order: any, status: string) => {
    const statusColor = status.toLowerCase() === 'delivered' ? '#27ae60' : '#f39c12';
    const isInvoiceStatus = ['shipped', 'delivered'].includes(status.toLowerCase());

    let attachmentNote = '';
    if (isInvoiceStatus) {
        attachmentNote = `<p>Please find your order invoice attached to this email as a PDF.</p>`;
    }

    return getBaseTemplate(`
        <h2>Order Status Update</h2>
        <p>Hi ${name},</p>
        <p>The status of your order <span class="highlight">#${order._id.toString().slice(-8).toUpperCase()}</span> has been updated to:</p>
        <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 1.2rem; font-weight: bold; padding: 10px 20px; border-radius: 5px; background-color: ${statusColor}; color: white; display: inline-block;">
                ${status.toUpperCase().replace(/_/g, ' ')}
            </span>
        </div>
        ${attachmentNote}
        <p>You can view your order details in your dashboard under "My Orders".</p>
        <p>Thank you for choosing BookStack!</p>
        <p>Best regards,<br>The BookStack Team</p>
    `);
};

export const getContactResponseTemplate = (name: string, message: string) => {
    return getBaseTemplate(`
        <h2>Thank you for reaching out!</h2>
        <p>Hi ${name},</p>
        <p>We have received your message and our team will get back to you as soon as possible.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; font-style: italic;">
            "${message}"
        </div>
        <p>In the meantime, feel free to browse our latest additions!</p>
        <p>Best regards,<br>BookStack Administration</p>
    `);
};

export const getDeletionScheduledTemplate = (name: string, deletionDate: string) => {
    return getBaseTemplate(`
        <h2 style="color: #e74c3c;">Account Deletion Scheduled</h2>
        <p>Hello ${name},</p>
        <p>This is to inform you that your BookStack account has been scheduled for deletion on <span class="highlight">${deletionDate}</span>.</p>
        <p>If this was not requested by you, please contact support immediately or log in to your account (if possible) to revoke this request.</p>
        <p>We're sorry to see you go.</p>
        <p>Best regards,<br>The BookStack Team</p>
    `);
};

export const getMembershipExpiryWarningTemplate = (name: string, expiryDate: Date) => {
    const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return getBaseTemplate(`
        <h2>Membership Expiring Soon</h2>
        <p>Hi ${name},</p>
        <p>Your premium membership at BookStack is scheduled to expire on <span class="highlight">${formattedDate}</span> (in 7 days).</p>
        <p>Don't lose your premium benefits like early access to new books and faster delivery. Renew your membership now to continue enjoying uninterrupted service.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/membership" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Renew Membership</a>
        </div>
        <p>Thank you for being a part of our community!</p>
        <p>Best regards,<br>The BookStack Team</p>
    `);
};

export const getMembershipExpiredTemplate = (name: string) => {
    return getBaseTemplate(`
        <h2>Membership Expired</h2>
        <p>Hi ${name},</p>
        <p>Your premium membership at BookStack has expired. Your account has been moved to the Basic plan.</p>
        <p>You can still browse our collection, but you'll lose access to premium features. You can renew your premium membership at any time to regain full access.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/membership" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Renew Now</a>
        </div>
        <p>We hope to see you back on the premium plan soon!</p>
        <p>Best regards,<br>The BookStack Team</p>
    `);
};
export const getQueryReplyTemplate = (name: string, originalMessage: string, replyText: string) => {
    return getBaseTemplate(`
        <h2>Response to Your Query</h2>
        <p>Hi ${name},</p>
        <p>Thank you for reaching out to BookStack support. Our administration team has reviewed your query and provided a response:</p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #3498db; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin-top: 0; font-weight: bold; color: #2c3e50;">Our Response:</p>
            <p style="white-space: pre-wrap;">${replyText}</p>
        </div>

        <div style="background-color: #fff9db; border: 1px solid #ffe066; padding: 15px; border-radius: 4px; font-size: 0.9em; color: #666; margin-top: 30px;">
            <p style="margin: 0; font-weight: bold;">Original Message (Sent by you):</p>
            <p style="margin: 5px 0 0; font-style: italic;">"${originalMessage}"</p>
        </div>

        <p style="margin-top: 30px;">If you have any further questions, please don't hesitate to contact us again.</p>
        <p>Best regards,<br>The BookStack Team</p>
    `);
};
