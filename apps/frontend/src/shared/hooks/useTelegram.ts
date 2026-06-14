'use client';

import { useContext } from 'react';
import {
  TelegramContext,
  type TelegramContextType
} from '@providers/TelegramProvider';

export function useTelegram(): TelegramContextType {
  const context = useContext(TelegramContext);

  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }

  return context;
}
