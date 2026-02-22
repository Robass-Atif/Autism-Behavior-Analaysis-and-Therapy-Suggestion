import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  Query,
  UseInterceptors,

  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterTherapistDto } from './dto/register-therapist.dto';
import { RegisterCaregiverDto } from './dto/register-caregiver.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // 1️⃣ POST /api/auth/login
  @Post('login')
  @ApiOperation({
    summary: 'Login with email + password',
    description: 'User login with role derived from backend. Only ACTIVE accounts can login.'
  })
  @ApiResponse({ status: 200, description: 'Login successful (ACTIVE account)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account blocked (PENDING/REJECTED/SUSPENDED)' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);

    // Set token in httpOnly cookie (more secure than localStorage)
    if (result.token) {
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      console.log('🍪 Auth token set in cookie');
    }

    return result;
  }

  // 2️⃣ POST /api/auth/check-registration-eligibility
  @Post('check-registration-eligibility')
  @ApiOperation({
    summary: 'Check email registration eligibility',
    description: 'Prevents rejected therapists from reapplying after 3 attempts'
  })
  @ApiResponse({ status: 200, description: 'Eligibility check completed' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async checkEligibility(@Body() dto: CheckEligibilityDto) {
    return this.authService.checkRegistrationEligibility(dto.email);
  }

  // 3️⃣ POST /api/auth/register/therapist
  @Post('register/therapist')
  @ApiOperation({
    summary: 'Therapist self-registration',
    description: 'Creates therapist account with PENDING status'
  })
  @UseInterceptors(FileInterceptor('licenseCertificate'))
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Email not eligible (rejected 3+ times)' })
  async registerTherapist(
    @Body() dto: RegisterTherapistDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.registerTherapist(dto, file);
  }

  // 4️⃣ POST /api/auth/forgot-password
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset email',
    description: 'Always returns 200 for security (doesn\'t reveal if email exists)'
  })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // 5️⃣ POST /api/auth/reset-password
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Complete password reset using token from email'
  })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token / Password validation failed' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.token,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  // 6️⃣ POST /api/auth/complete-onboarding
  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete therapist onboarding',
    description: 'Mark therapist onboarding as complete'
  })
  @ApiResponse({ status: 200, description: 'Onboarding completed' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'User not authenticated' })
  async completeOnboarding(
    @Req() req: any,
    @Body() dto: CompleteOnboardingDto
  ) {
    return this.authService.completeOnboarding(req.user.sub, dto);
  }

  // 7️⃣ GET /api/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user',
    description: 'Returns current user details from JWT token'
  })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized (invalid/expired token)' })
  async getMe(@Req() req: any) {
    return this.authService.getCurrentUser(req.user.sub);
  }

  // 8️⃣ POST /api/auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate token/session'
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    // Clear auth cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    console.log('🍪 Auth cookie cleared');

    return this.authService.logout(req.user.sub);
  }

  // 2️⃣0️⃣ POST /api/auth/register/caregiver
  @Post('register/caregiver')
  @ApiOperation({
    summary: 'Caregiver registration with invitation code',
    description: 'Creates caregiver account linked to patient via invitation'
  })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Invalid/expired invitation code' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async registerCaregiver(@Body() dto: RegisterCaregiverDto) {
    return this.authService.registerCaregiver(dto);
  }

  // 2️⃣1️⃣ POST /api/auth/register/admin
  @Post('register/admin')
  @ApiOperation({
    summary: 'Admin registration',
    description: 'Creates a new admin user'
  })
  @ApiResponse({ status: 201, description: 'Admin registration successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async registerAdmin(@Body() dto: RegisterAdminDto) {
    return this.authService.registerAdmin(dto);
  }
  
  // 2️⃣2️⃣ GET /api/auth/verify-email
  @Get('verify-email')
  @ApiOperation({
    summary: 'Verify email with token',
    description: 'Validates email verification token and activates the account or sets it to pending approval'
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}

