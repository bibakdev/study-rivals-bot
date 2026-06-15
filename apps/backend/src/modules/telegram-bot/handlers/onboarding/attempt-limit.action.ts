import { Context } from 'telegraf';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';

export const handleFailedAttempt = async (
  ctx: Context,
  telegramId: number
): Promise<void> => {
  const updatedForbidden = await ForbiddenUserModel.findOneAndUpdate(
    { telegramId },
    { $inc: { attemptsCount: 1 } },
    { upsert: true, new: true }
  );

  if (updatedForbidden.attemptsCount >= 3) {
    await ForbiddenUserModel.updateOne(
      { telegramId },
      { $set: { isBlacklisted: true } }
    );
    await ctx.reply(
      '❌ ۳ بار کد اشتباه وارد کردید. حساب شما برای همیشه مسدود شد.'
    );
  } else {
    const remaining = 3 - updatedForbidden.attemptsCount;
    await ctx.reply(
      `❌ کد وارد شده نامعتبر است. (${remaining} فرصت باقی مانده)`
    );
  }
};
