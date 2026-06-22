// apps/backend/src/modules/telegram-bot/handlers/time-log/select-day.action.ts

import { Context, Markup } from 'telegraf';
import jalaali from 'jalaali-js';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export const handleSelectDayAction = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const dayIndex = parseInt(ctx.match[2], 10);
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!telegramId) return;

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) {
      await ctx.editMessageText('❌ چالش یافت نشد.').catch(() => {});
      return;
    }

    if (challenge.status !== 'active') {
      await ctx
        .editMessageText(
          '⚠️ این چالش به پایان رسیده است و دیگر امکان ثبت یا ویرایش زمان در آن وجود ندارد.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    '🔙 بازگشت به پنل',
                    `select_tenant_${challenge.tenantId}`
                  )
                ]
              ]
            }
          }
        )
        .catch(() => {});
      return;
    }

    // ⛔ گارد امنیتی
    const isParticipating = challenge.teams.some((team) =>
      team.members.includes(telegramId)
    );

    if (!isParticipating) {
      await ctx
        .editMessageText('⛔️ شما در تیم‌های این چالش حضور ندارید.', {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت',
                  `select_tenant_${challenge.tenantId}`
                )
              ]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    const targetDateMs =
      challenge.startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000;
    const targetDate = new Date(targetDateMs);
    const TEHRAN_OFFSET = 3.5 * 60 * 60 * 1000;

    // رندر هماهنگ تقویم جلال با آفست تهران
    const { jd, jm } = jalaali.toJalaali(
      new Date(targetDateMs + TEHRAN_OFFSET)
    );
    const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

    const existingLog = await TimeLogModel.findOne({
      challengeId: challenge._id,
      telegramId,
      date: targetDate
    }).lean();

    const currentLoggedMinutes = existingLog ? existingLog.minutes : 0;

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '➕ اضافه کردن ساعت',
          `prompt_time_add_${challengeId}_${dayIndex}`
        )
      ],
      [
        Markup.button.callback(
          '✏️ ویرایش کل ساعت',
          `prompt_time_edit_${challengeId}_${dayIndex}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست روزها',
          `action_log_time_${challenge.tenantId}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        `📅 **روز ${dayIndex + 1} (${dateLabel})**\n\n` +
          `⏱ **ساعت ثبت شده فعلی شما:** ${formatMinutesToTime(currentLoggedMinutes)}\n\n` +
          `لطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error selecting day for time log:', error);
  }
};
