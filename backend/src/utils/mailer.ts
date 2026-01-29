import * as brevo from '@getbrevo/brevo';

export const sendEmail = async (to: string, subject: string, text: string) => {
  // Validate environment variables
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not set in environment variables');
    throw new Error('BREVO_API_KEY is not configured');
  }

  if (!process.env.EMAIL_USER) {
    console.error('EMAIL_USER is not set in environment variables');
    throw new Error('EMAIL_USER is not configured');
  }

  console.log(`Attempting to send email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${process.env.EMAIL_USER}`);

  const apiInstance = new brevo.TransactionalEmailsApi();

  // Configure API key authorization
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.sender = {
    name: 'BookStack',
    email: process.env.EMAIL_USER
  };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.textContent = text;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully!');
    return data;
  } catch (err: any) {
    console.error('Email sending failed:');
    console.error('Error details:', err.message || err);
    if (err.response) {
      console.error('API Response:', err.response.body);
    }
    throw err; // Re-throw so calling code knows it failed
  }
};
