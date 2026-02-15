import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailtrapClient } from 'mailtrap';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private mailtrapClient: MailtrapClient;
  private useMailtrap: boolean = false;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const mailtrapToken = this.configService.get<string>('MAILTRAP_TOKEN');

    // Prioritize Sandbox SMTP for development/testing if configured
    if (smtpHost?.includes('sandbox.smtp.mailtrap.io')) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT'),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.useMailtrap = false; // Use SMTP transporter instead of API client
      this.logger.log('✅ Email service initialized with Mailtrap Sandbox (SMTP)');
    } else if (mailtrapToken) {
      // Use Mailtrap Node.js Client (Production API)
      this.mailtrapClient = new MailtrapClient({ token: mailtrapToken });
      this.useMailtrap = true;
      this.logger.log('✅ Email service initialized with Mailtrap API Client');
    } else {
      // Fallback to SMTP
      this.logger.warn('⚠️ No Mailtrap token found, falling back to SMTP');
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT'),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('✅ Email service initialized with SMTP');
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const fromEmail = this.configService.get<string>('MAILTRAP_SENDER_EMAIL') || 'hello@demomailtrap.com';
    const fromName = this.configService.get<string>('MAILTRAP_SENDER_NAME') || 'ASD Therapy Platform';

    try {
      if (this.useMailtrap) {
        const sender = { email: fromEmail, name: fromName };
        const recipients = [{ email: to }];

        await this.mailtrapClient.send({
          from: sender,
          to: recipients,
          subject,
          html,
          category: 'Transactional Email',
        });
        this.logger.log(`📧 Mailtrap: Email sent to ${to}`);
      } else {
        // Fallback SMTP / Sandbox
        const mailOptions = {
          from: `"${fromName}" <${this.configService.get<string>('EMAIL_FROM')}>`,
          to,
          subject,
          html,
        };
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`📧 SMTP/Sandbox: Email sent to ${to}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}`, error);
      // Don't throw - email failure shouldn't block registration
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: #18181b; color: white; padding: 24px; text-align: center; }
          .content { padding: 40px; }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: #000;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
          }
          .footer { text-align: center; padding: 24px; background: #f4f4f5; color: #71717a; font-size: 12px; }
          h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
          h2 { color: #18181b; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ASD Therapy Platform</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email</h2>
            <p>Hi ${name},</p>
            <p>Thanks for joining ASD Therapy Platform. To complete your registration and secure your account, please verify your email address.</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </p>
            <p style="font-size: 14px; color: #71717a;">Or copy this link to your browser:</p>
            <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${verificationLink}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ASD Therapy Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Verify Your Email', html);
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: #18181b; color: white; padding: 24px; text-align: center; }
          .content { padding: 40px; }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: #000;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
          }
          .footer { text-align: center; padding: 24px; background: #f4f4f5; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ASD Therapy Platform</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. If this was you, click the button below:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p style="font-size: 14px; color: #71717a;">This link expires in 1 hour.</p>
          </div>
          <div class="footer">
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} ASD Therapy Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Reset Your Password', html);
  }

  async sendApprovalNotification(
    email: string,
    name: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const loginLink = `${frontendUrl}/login`;
    const color = approved ? '#10b981' : '#ef4444';
    const status = approved ? 'Approved' : 'Not Approved';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: ${color}; color: white; padding: 24px; text-align: center; }
          .content { padding: 40px; }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: ${color};
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
          }
          .footer { text-align: center; padding: 24px; background: #f4f4f5; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <h2>Status: ${status}</h2>
            <p>Hi ${name},</p>
            ${approved
        ? `<p>Congratulations! Your account has been approved. You can now access the platform.</p>
                 <p style="text-align: center;"><a href="${loginLink}" class="button">Login Now</a></p>`
        : `<p>We reviewed your application, but unfortunately we cannot approve it at this time.</p>
                 ${reason ? `<p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}`
      }
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ASD Therapy Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Application Status: ${status}`, html);
  }

  async sendInvitationEmail(
    email: string,
    therapistName: string,
    invitationCode: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const registerLink = `${frontendUrl}/register/caregiver?code=${invitationCode}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: #18181b; color: white; padding: 24px; text-align: center; }
          .content { padding: 40px; }
          .code-box {
            background: #f4f4f5;
            border: 2px dashed #d4d4d8;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            margin: 24px 0;
          }
          .code { font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #000; }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: #000;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
            display: block;
            text-align: center;
            max-width: 200px;
            margin: 0 auto;
          }
          .footer { text-align: center; padding: 24px; background: #f4f4f5; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p><strong>${therapistName}</strong> has invited you to join the ASD Therapy Platform as a Caregiver.</p>
            <p>Your unique invitation code is:</p>
            <div class="code-box">
              <span class="code">${invitationCode}</span>
            </div>
            <p>Click below to create your account:</p>
            <a href="${registerLink}" class="button">Register Now</a>
            <p style="font-size: 12px; color: #71717a; text-align: center;">This code expires in 7 days.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ASD Therapy Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Invitation to Join ASD Therapy Platform`, html);
  }

  // Keeping other methods but simplifying their templates if needed
  // For now, mapping remaining specific email methods to use the generic sendEmail

  async sendTherapistApprovalEmail(email: string, name: string): Promise<void> {
    return this.sendApprovalNotification(email, name, true);
  }

  async sendTherapistRejectionEmail(email: string, name: string, reason: string, count: number): Promise<void> {
    return this.sendApprovalNotification(email, name, false, `${reason} (Attempt ${count}/3)`);
  }

  async sendAccountSuspensionEmail(email: string, name: string, reason: string): Promise<void> {
    const html = `
      <h1>Account Suspended</h1>
      <p>Hi ${name},</p>
      <p>Your account has been suspended.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Contact support for assistance.</p>
    `;
    await this.sendEmail(email, 'Account Suspended', html);
  }

  async sendAccountReactivationEmail(email: string, name: string): Promise<void> {
    const html = `
      <h1>Account Reactivated</h1>
      <p>Hi ${name},</p>
      <p>Your account is now active again. Welcome back!</p>
    `;
    await this.sendEmail(email, 'Account Reactivated', html);
  }

  async sendAccountDeletionEmail(email: string, name: string, reason: string): Promise<void> {
    const html = `
      <h1>Account Deleted</h1>
      <p>Hi ${name},</p>
      <p>Your account has been deleted.</p>
      <p><strong>Reason:</strong> ${reason}</p>
    `;
    await this.sendEmail(email, 'Account Deleted', html);
  }
}
