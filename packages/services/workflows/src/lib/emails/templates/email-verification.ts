import { button, email, mjml, paragraph } from '../components.js';

export function renderEmailVerificationEmail(input: { verificationLink: string; toEmail: string }) {
  return email({
    title: `Verify Your Email Address`,
    body: mjml`
      ${paragraph(`To complete your sign-up, please verify your email address by clicking the link below:`)}
      ${button({ url: input.verificationLink, text: 'Verify Email' })}
      ${paragraph(`If you didn't sign up, you can ignore this email.`)}
    `,
  });
}
