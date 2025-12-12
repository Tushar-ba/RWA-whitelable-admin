import sgMail from '@sendgrid/mail';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private static instance: EmailService;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeSendGrid();
  }

  private initializeSendGrid() {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️ SENDGRID_API_KEY not found in environment variables');
      return;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.isConfigured = true;
    console.log('✅ SendGrid email service initialized');
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send admin invitation email with OTP
   */
  async sendAdminInvitationEmail(
    email: string, 
    adminName: string, 
    otp: string, 
    inviterName: string,
    temporaryPassword: string
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/login`;
    
    const mailOptions = {
      to: email,
      from: {
        email: process.env.SENDGRID_EMAIL,
        name: process.env.SENDGRID_NAME
      },
      subject: 'Welcome to Solulab Assets Admin Panel - Account Created',
      text: `Hi ${adminName},

You have been invited to join the Solulab Assets Admin Panel by ${inviterName}.

Your admin account has been created with the following credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

For security, please verify your email with this OTP code: ${otp}

Steps to get started:
1. Visit: ${loginUrl}
2. Log in with your email and temporary password
3. Enter the OTP code: ${otp}
4. Change your password on first login

This invitation and OTP will expire in 24 hours.

Welcome to the team!

Best regards,
Solulab Assets Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #8F541D 0%, #CF9531 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Solulab Assets</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Admin Panel Access</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${adminName}</strong>,</p>
            
            <p style="color: #555; line-height: 1.6;">
              You have been invited to join the Solulab Assets Admin Panel by <strong>${inviterName}</strong>. 
              Your admin account has been created and is ready to use.
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #8F541D; padding: 20px; margin: 25px 0;">
              <h3 style="color: #8F541D; margin: 0 0 15px 0;">Login Credentials</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${temporaryPassword}</code></p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h3 style="color: #8F541D; margin: 0 0 10px 0;">Email Verification Required</h3>
              <p style="margin: 10px 0; color: #555;">Please use this OTP code to verify your email:</p>
              <div style="font-size: 32px; font-weight: bold; color: #CF9531; letter-spacing: 5px; margin: 15px 0;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 14px; margin: 0;">This code expires in 24 hours</p>
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #8F541D;">Getting Started:</h3>
              <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>Visit the admin panel: <a href="${loginUrl}" style="color: #8F541D;">${loginUrl}</a></li>
                <li>Log in with your email and temporary password</li>
                <li>Enter the OTP code above when prompted</li>
                <li>Change your password on first login for security</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #8F541D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Access Admin Panel
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                <strong>Security Note:</strong> Please keep your login credentials secure and change your password immediately after first login.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from Solulab Assets Platform.</p>
            <p style="margin: 5px 0 0 0;">Please do not reply to this email. For support, contact your administrator.</p>
          </div>
        </div>
      `
    };

    await this.sendEmail(mailOptions);
  }

  /**
   * Send OTP verification email for existing admins
   */
  async sendOTPEmail(email: string, otp: string, adminName?: string): Promise<void> {
    const userName = adminName || 'Admin';
    
    const mailOptions = {
      to: email,
      from: {
        email: process.env.SENDGRID_EMAIL,
        name: process.env.SENDGRID_NAME
      },
      subject: 'Solulab Assets - Email Verification Code',
      text: `Hi ${userName},

Your verification code for Solulab Assets Admin Panel is: ${otp}

This code will expire in 10 minutes.

If you didn't request this, please contact your administrator immediately.

Thank you,
Solulab Assets Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8F541D 0%, #CF9531 100%); color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Solulab Assets Admin Panel</h2>
            <p style="margin: 10px 0 0 0;">Email Verification</p>
          </div>
          
          <div style="padding: 30px;">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <p style="color: #555;">Your verification code for the Solulab Assets Admin Panel is:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #CF9531; letter-spacing: 8px; margin: 10px 0;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">This code expires in 10 minutes</p>
            </div>
            
            <p style="color: #555;">If you didn't request this verification code, please contact your administrator immediately.</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated security message from Solulab Assets Platform.</p>
          </div>
        </div>
      `
    };

    await this.sendEmail(mailOptions);
  }

  /**
   * Send change password OTP email
   */
  async sendChangePasswordOTPEmail(
    email: string, 
    otp: string, 
    adminName?: string
  ): Promise<void> {
    const userName = adminName || 'Admin';
    
    const mailOptions = {
      to: email,
      from: {
        email: process.env.SENDGRID_EMAIL,
        name: process.env.SENDGRID_NAME
      },
      subject: 'Solulab Assets - Change Password Verification',
      text: `Hi ${userName},

You have requested to change your password for Solulab Assets Admin Panel.

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this password change, please contact your administrator immediately.

Thank you,
Solulab Assets Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8F541D 0%, #CF9531 100%); color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Password Change Verification</h2>
            <p style="margin: 10px 0 0 0;">Solulab Assets Admin Panel</p>
          </div>
          
          <div style="padding: 30px;">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <p style="color: #555;">You have requested to change your password for the Solulab Assets Admin Panel.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #CF9531; letter-spacing: 8px; margin: 10px 0;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">This code expires in 10 minutes</p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Security Notice:</strong> If you didn't request this password change, please contact your administrator immediately.
              </p>
            </div>
            
            <p style="color: #555;">Enter this verification code to proceed with changing your password.</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated security message from Solulab Assets Platform.</p>
          </div>
        </div>
      `
    };

    await this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string, 
    resetToken: string, 
    adminName?: string
  ): Promise<void> {
    const userName = adminName || 'Admin';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      to: email,
      from: {
        email: process.env.SENDGRID_EMAIL,
        name: process.env.SENDGRID_NAME
      },
      subject: 'Solulab Assets - Password Reset Request',
      text: `Hi ${userName},

You requested to reset your password for Solulab Assets Admin Panel.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email and contact your administrator.

Thank you,
Solulab Assets Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8F541D 0%, #CF9531 100%); color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Password Reset Request</h2>
            <p style="margin: 10px 0 0 0;">Solulab Assets Admin Panel</p>
          </div>
          
          <div style="padding: 30px;">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <p style="color: #555;">You requested to reset your password for the Solulab Assets Admin Panel.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #8F541D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request this password reset, please ignore this email and contact your administrator.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this URL into your browser:<br>
              <span style="word-break: break-all; font-family: monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${resetUrl}</span>
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated security message from Solulab Assets Platform.</p>
          </div>
        </div>
      `
    };

    await this.sendEmail(mailOptions);
  }

  /**
   * Send mint success notification email with vault allocation details
   */
  async sendMintSuccessEmail(
    userEmail: string,
    userName: string,
    vaultAllocation: {
      vaultNumber: string;
      vaultLocation: string;
      ownedPortion: string;
      barSerialNumber: string;
      brandInfo: string;
      grossWeight: string;
      fineness: string;
      fineWeight: string;
    },
    tokenDetails: {
      metal: string;
      tokenAmount: string;
      usdAmount: string;
      transactionHash: string;
    }
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard`;
    
    const mailOptions = {
      to: userEmail,
      from: {
        email: process.env.SENDGRID_EMAIL,
        name: 'Solulab Assets'
      },
      subject: `Tokens Successfully Minted - ${tokenDetails.metal.toUpperCase()} Investment Confirmed`,
      text: `Dear ${userName},

Great news! Your ${tokenDetails.metal} investment has been successfully processed and your tokens have been minted.

INVESTMENT SUMMARY:
- Metal Type: ${tokenDetails.metal.toUpperCase()}
- Token Amount: ${tokenDetails.tokenAmount}
- USD Value: $${tokenDetails.usdAmount}
- Transaction Hash: ${tokenDetails.transactionHash}

VAULT ALLOCATION DETAILS:
- Vault Number: ${vaultAllocation.vaultNumber}
- Location: ${vaultAllocation.vaultLocation}
- Your Portion: ${vaultAllocation.ownedPortion}
- Bar Serial Number: ${vaultAllocation.barSerialNumber}
- Brand/Refinery: ${vaultAllocation.brandInfo}
- Gross Weight: ${vaultAllocation.grossWeight}
- Fineness: ${vaultAllocation.fineness}
- Fine Weight: ${vaultAllocation.fineWeight}

Your tokens are now active and represent your ownership of physical ${tokenDetails.metal} stored securely in our allocated vault.

You can view your complete investment portfolio at: ${dashboardUrl}

Thank you for choosing Solulab Assets for your precious metals investment.

Best regards,
Vaulted Assets Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #8F541D 0%, #CF9531 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Investment Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your ${tokenDetails.metal.toUpperCase()} tokens have been successfully minted</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 18px; color: #2c3e50;"><strong>Dear ${userName},</strong></p>
            
            <p style="color: #555; line-height: 1.6;">
              Congratulations! Your ${tokenDetails.metal} investment has been successfully processed and your digital tokens have been minted. 
              Your investment is now backed by physical ${tokenDetails.metal} stored in our secure allocated vault.
            </p>

            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #CF9531; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h3 style="margin: 0 0 15px 0; color: #8F541D; font-size: 18px;">📊 Investment Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #495057;">Metal Type:</td>
                  <td style="padding: 8px 0; color: #6c757d; text-align: right;">${tokenDetails.metal.toUpperCase()}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #495057;">Token Amount:</td>
                  <td style="padding: 8px 0; color: #6c757d; text-align: right;">${tokenDetails.tokenAmount}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #495057;">USD Value:</td>
                  <td style="padding: 8px 0; color: #28a745; text-align: right; font-weight: bold;">$${tokenDetails.usdAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #495057;">Transaction Hash:</td>
                  <td style="padding: 8px 0; color: #6c757d; text-align: right; font-family: monospace; font-size: 12px; word-break: break-all;">${tokenDetails.transactionHash}</td>
                </tr>
              </table>
            </div>

            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h3 style="margin: 0 0 15px 0; color: #8F541D; font-size: 18px;">🏦 Vault Allocation Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Vault Number:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right; font-weight: bold;">${vaultAllocation.vaultNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Location:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right;">${vaultAllocation.vaultLocation}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Your Portion:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right; font-weight: bold;">${vaultAllocation.ownedPortion}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Bar Serial Number:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right; font-family: monospace;">${vaultAllocation.barSerialNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Brand/Refinery:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right;">${vaultAllocation.brandInfo}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Gross Weight:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right;">${vaultAllocation.grossWeight}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1c40f;">
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Fineness:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right;">${vaultAllocation.fineness}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #795548;">Fine Weight:</td>
                  <td style="padding: 8px 0; color: #5d4037; text-align: right; font-weight: bold;">${vaultAllocation.fineWeight}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; color: #155724; font-size: 14px; line-height: 1.5;">
                <strong>🔒 Security & Ownership:</strong> Your tokens represent verifiable ownership of physical ${tokenDetails.metal} stored in our secure, allocated vault. 
                Your investment is fully backed by real precious metals that you own a specific portion of.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background-color: #8F541D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                View Your Portfolio
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              Thank you for choosing Solulab Assets for your precious metals investment. Your trust in our platform and our commitment to security and transparency makes this partnership valuable.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #dee2e6;">
            <p style="margin: 0 0 10px 0;">This is an automated confirmation from Solulab Assets Platform.</p>
            <p style="margin: 0;">Keep this email for your records. Your transaction hash serves as proof of token minting.</p>
          </div>
        </div>
      `
    };

    await this.sendEmail(mailOptions);
  }

  /**
   * Generic email sending method
   */
  private async sendEmail(mailOptions: any): Promise<void> {
    if (!this.isConfigured) {
      // In development or when SendGrid is not configured, log to console
      console.log('📧 [DEV] Email would be sent:');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Content: ${mailOptions.text}`);
      console.log('----------------------------------------');
      return;
    }

    try {
      await sgMail.send(mailOptions);
      console.log(`✅ Email sent successfully to ${mailOptions.to}`);
    } catch (error: any) {
      console.error('❌ Failed to send email:', error);
      console.error('❌ SendGrid error details:', error.response?.body);
      throw new Error('Failed to send email');
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();