// packages/shared-types/src/models/user.types.ts

export type UserRole = 'mother' | 'standard';

export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForbiddenUserDto {
  telegramId: number;
  attemptsCount: number;
  isBlacklisted: boolean;
  updatedAt: Date;
}
