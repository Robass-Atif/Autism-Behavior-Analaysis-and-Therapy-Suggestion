import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>("SMTP_HOST");
    const smtpPort = this.configService.get<number>("SMTP_PORT");
    const smtpUser = this.configService.get<string>("SMTP_USER");
    const smtpPass = this.configService.get<string>("SMTP_PASS");

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports (587)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Often needed for Gmail with some node versions
      },
    });

    this.logger.log(
      `✅ Email service initialized with SMTP: ${smtpHost}:${smtpPort}`,
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: any[],
  ): Promise<void> {
    const from =
      this.configService.get<string>("EMAIL_FROM") ||
      "mohammad.abdullah.5434@gmail.com";

    try {
      const mailOptions: any = {
        from: from,
        to,
        subject,
        html,
        attachments,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}`, error);
      // Don't throw - email failure shouldn't block the main process in many cases
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
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

    await this.sendEmail(email, "Verify Your Email", html);
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
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

    await this.sendEmail(email, "Reset Your Password", html);
  }

  async sendApprovalNotification(
    email: string,
    name: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const loginLink = `${frontendUrl}/login`;
    const color = approved ? "#10b981" : "#ef4444";
    const status = approved ? "Approved" : "Not Approved";

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
            ${
              approved
                ? `<p>Congratulations! Your account has been approved. You can now access the platform.</p>
                 <p style="text-align: center;"><a href="${loginLink}" class="button">Login Now</a></p>`
                : `<p>We reviewed your application, but unfortunately we cannot approve it at this time.</p>
                 ${reason ? `<p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;"><strong>Reason:</strong> ${reason}</p>` : ""}`
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
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
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

    await this.sendEmail(
      email,
      `Invitation to Join ASD Therapy Platform`,
      html,
    );
  }

  async sendPublishedReportEmail(
    email: string,
    caregiverName: string,
    patientName: string,
    pdfBuffer: Buffer,
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: #18181b; color: white; padding: 24px; text-align: center; }
          .content { padding: 40px; }
          .footer { text-align: center; padding: 24px; background: #f4f4f5; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Session Report Available</h1>
          </div>
          <div class="content">
            <h2>Hi ${caregiverName},</h2>
            <p>Your therapist has reviewed and published the latest session recording for <strong>${patientName}</strong>.</p>
            <p>We've attached the newly generated <strong>Clinical ADOS-2 Summary Report</strong> to this email as a PDF for your convenience so you can track longitudinal progress and behavioral milestones.</p>
            <p>You can also log into the Neurocare portal at any time to view the AI-analyzed metrics interactively.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ASD Therapy Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const attachments = [
      {
        filename: `clinical_report_${patientName.replace(/\s+/g, "_")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];

    await this.sendEmail(
      email,
      `Published Session Report: ${patientName}`,
      html,
      attachments,
    );
  }

  // Keeping other methods but simplifying their templates if needed
  // For now, mapping remaining specific email methods to use the generic sendEmail

  async sendTherapistApprovalEmail(email: string, name: string): Promise<void> {
    return this.sendApprovalNotification(email, name, true);
  }

  async sendTherapistRejectionEmail(
    email: string,
    name: string,
    reason: string,
    count: number,
  ): Promise<void> {
    return this.sendApprovalNotification(
      email,
      name,
      false,
      `${reason} (Attempt ${count}/3)`,
    );
  }

  async sendAccountSuspensionEmail(
    email: string,
    name: string,
    reason: string,
  ): Promise<void> {
    const html = `
      <h1>Account Suspended</h1>
      <p>Hi ${name},</p>
      <p>Your account has been suspended.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Contact support for assistance.</p>
    `;
    await this.sendEmail(email, "Account Suspended", html);
  }

  async sendAccountReactivationEmail(
    email: string,
    name: string,
  ): Promise<void> {
    const html = `
      <h1>Account Reactivated</h1>
      <p>Hi ${name},</p>
      <p>Your account is now active again. Welcome back!</p>
    `;
    await this.sendEmail(email, "Account Reactivated", html);
  }

  async sendAccountDeletionEmail(
    email: string,
    name: string,
    reason: string,
  ): Promise<void> {
    const html = `
      <h1>Account Deleted</h1>
      <p>Hi ${name},</p>
      <p>Your account has been deleted.</p>
      <p><strong>Reason:</strong> ${reason}</p>
    `;
    await this.sendEmail(email, "Account Deleted", html);
  }
}
