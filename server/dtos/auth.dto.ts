export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  admin: {
    id: string;
    email: string;
    name: string;
    roleId?: string;
  };
}

export interface OtpRequestDto {
  otp: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  password: string;
  token?: string;
}

export interface AuthResponseDto {
  message: string;
  success?: boolean;
}