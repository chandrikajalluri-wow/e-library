import * as brevo from '@getbrevo/brevo';

export const sendEmail = async (to: string, subject: string, text: string) => {
  const apiInstance = new brevo.TransactionalEmailsApi();

  // Configure API key authorization
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY || ''
  );

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.sender = {
    name: 'E-Library',
    email: process.env.EMAIL_USER || ''
  };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.textContent = text;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Message sent:', data);
  } catch (err) {
    console.error('Email error:', err);
  }
};
