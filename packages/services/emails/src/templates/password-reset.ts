import { button, email, mjml, paragraph } from './components';

export function renderPasswordResetEmail(input: {
  subject: string;
  passwordResetLink: string;
  toEmail: string;
}) {
  return email({
    title: `Reset Your Password`,
    body: mjml`
      ${paragraph(`We received a request to reset your password. Click the link below to set a new password:`)}
      ${button({ url: input.passwordResetLink, text: 'Reset your password' })}
      ${paragraph(`If you didn't request a password reset, you can ignore this email.`)}
    `,
  });
}
