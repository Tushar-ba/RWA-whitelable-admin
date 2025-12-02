export interface CreateUserDto {
  email: string;
  kycStatus?: 'verified' | 'pending' | 'rejected';
  accountStatus?: 'active' | 'suspended';
}

export interface UpdateUserDto {
  kycStatus?: 'verified' | 'pending' | 'rejected';
  accountStatus?: 'active' | 'suspended';
  lastActivity?: Date;
}

export interface UserResponseDto {
  id: string;
  email: string;
  kycStatus: 'verified' | 'pending' | 'rejected';
  accountStatus: 'active' | 'suspended';
  joinDate: Date;
  lastActivity: Date;
  createdAt: Date;
}