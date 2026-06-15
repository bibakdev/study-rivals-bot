import { Context } from 'telegraf';
import { UserModel } from '#modules/auth/user.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { logger } from '#utils/logger';

export const handleMotherAuth = async (
  ctx: Context,
  telegramId: number
): Promise<void> => {
  try {
    await UserModel.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          firstName: ctx.from?.first_name || 'کاربر',
          lastName: ctx.from?.last_name,
          username: ctx.from?.username,
          languageCode: ctx.from?.language_code,
          role: 'mother'
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    await ForbiddenUserModel.deleteOne({ telegramId });
    logger.info(`Mother account activated. TelegramId: ${telegramId}`);
    await ctx.reply(
      '👑 **مالک پلتفرم تایید شد!**\nشما به عنوان اکانت مادر شناخته شدید.\nبرای فعال‌سازی چالش‌ها، کافیست ربات را به گروه‌های خود ببرید و در تاپیک مربوطه کلمه `start` را بفرستید.'
    );
  } catch (mongoError: unknown) {
    if (
      typeof mongoError === 'object' &&
      mongoError !== null &&
      'code' in mongoError
    ) {
      if ((mongoError as { code: number }).code === 11000) {
        await ctx.reply('❌ پلتفرم در حال حاضر یک اکانت مادر مستقل دارد.');
        return;
      }
    }
    throw mongoError;
  }
};
