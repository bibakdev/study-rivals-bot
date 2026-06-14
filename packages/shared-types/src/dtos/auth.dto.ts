export interface TelegramInitDataDto {
  initData: string;
}

export interface AuthSuccessResponseDto {
  token: string;
  user: {
    id: string;
    telegramId: number;
    firstName: string;
    lastName?: string;
    username?: string;
  };
}
