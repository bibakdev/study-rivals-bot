// apps/backend/src/core/services/cron.service.ts

import cron from 'node-cron';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { botService } from '#modules/telegram-bot/bot.service';
import { dailyReportService } from '#modules/challenge/services/daily-report.service';
import { generateLeaderboardText } from '#modules/challenge/utils/leaderboard.util';
import { logger } from '#utils/logger';

class CronService {
  /**
   * راه‌اندازی تمام تسک‌های زمان‌بندی شده سیستم
   */
  public initialize(): void {
    // اجرای دقیق در ساعت 00:00 بامداد هر روز به وقت تهران
    cron.schedule(
      '0 0 * * *',
      async () => {
        logger.info(
          'CronJob Triggered: Starting daily challenge report generation...'
        );
        try {
          await this.processDailyReports();
        } catch (error) {
          logger.error(
            'Critical Error during daily challenge report cron job:',
            error
          );
        }
      },
      {
        // 👈 پراپرتی scheduled حذف شد تا خطای تایپ‌اسکریپت برطرف شود (مقدار پیش‌فرض آن true است)
        timezone: 'Asia/Tehran'
      }
    );

    logger.info('Cron service initialized successfully.');
  }

  /**
   * متد اصلی پردازش گزارش‌های روزانه و ارسال در تلگرام
   */
  private async processDailyReports(): Promise<void> {
    // ۱. پیدا کردن تمام چالش‌های در حال اجرا
    const activeChallenges = await ChallengeModel.find({ status: 'active' });

    if (activeChallenges.length === 0) {
      logger.info('No active challenges found for daily report.');
      return;
    }

    const telegram = botService.getBot().telegram;
    const DAY_MS = 24 * 60 * 60 * 1000;

    // ترفند مهندسی: چون کرون دقیقاً 00:00 (یا چند میلی‌ثانیه بعد) اجرا می‌شود،
    // برای اینکه مطمئن شویم محاسبات مربوط به "روزی که گذشت" است، 10 دقیقه به عقب برمی‌گردیم.
    const now = Date.now();
    const referenceTime = now - 10 * 60 * 1000;

    for (const challenge of activeChallenges) {
      try {
        const startMs = challenge.startDate.getTime();
        const reportDayIndex = Math.floor((referenceTime - startMs) / DAY_MS);

        // اگر چالش هنوز شروع نشده یا از مدت زمان آن گذشته است، نادیده می‌گیریم
        if (reportDayIndex < 0 || reportDayIndex >= challenge.durationDays) {
          continue;
        }

        // تاریخ دقیق روزی که به پایان رسیده (برای کوئری دیتابیس)
        const targetDate = new Date(startMs + reportDayIndex * DAY_MS);

        // ۲. تولید متن گزارش روزانه
        const reportText = await dailyReportService.generateReportText(
          challenge,
          reportDayIndex,
          targetDate
        );

        if (!reportText) continue;

        // ۳. پیدا کردن گروه تلگرامی متصل به این چالش
        const tenant = await TenantModel.findById(challenge.tenantId).lean();
        if (!tenant || !tenant.chatId) continue;

        const sendOptions: any = { parse_mode: 'Markdown' };
        if (tenant.topicId) sendOptions.message_thread_id = tenant.topicId;

        // ۴. پاک‌سازی پیام‌های قبلی (جداکننده و لیدربرد)
        if (challenge.lastDividerMessageId) {
          await telegram
            .deleteMessage(tenant.chatId, challenge.lastDividerMessageId)
            .catch(() => {});
        }
        if (challenge.lastLeaderboardMessageId) {
          await telegram
            .deleteMessage(tenant.chatId, challenge.lastLeaderboardMessageId)
            .catch(() => {});
        }

        // ۵. ارسال گزارش روزانه
        await telegram
          .sendMessage(tenant.chatId, reportText, sendOptions)
          .catch((err) => {
            logger.error(
              `Failed to send daily report for challenge ${challenge._id}:`,
              err
            );
          });

        // ۶. ارسال خط جداکننده جدید
        const dividerMsg = await telegram
          .sendMessage(tenant.chatId, '➖➖➖➖➖➖➖➖➖', sendOptions)
          .catch(() => null);

        // ۷. تولید و ارسال رتبه‌بندی کل آپدیت‌شده
        const leaderboardStr = await generateLeaderboardText(challenge._id);
        let sentLbMsg = null;
        if (leaderboardStr) {
          sentLbMsg = await telegram
            .sendMessage(tenant.chatId, leaderboardStr, sendOptions)
            .catch(() => null);
        }

        // ۸. ذخیره آیدی پیام‌های جدید در دیتابیس برای پاک‌سازی‌های بعدی
        await ChallengeModel.findByIdAndUpdate(challenge._id, {
          $set: {
            lastDividerMessageId: dividerMsg ? dividerMsg.message_id : null,
            lastLeaderboardMessageId: sentLbMsg ? sentLbMsg.message_id : null
          }
        });

        logger.info(
          `Successfully processed daily report for challenge ${challenge._id}, Day ${reportDayIndex + 1}`
        );
      } catch (err) {
        logger.error(
          `Error processing daily report for challenge ${challenge._id}:`,
          err
        );
      }
    }
  }
}

export const cronService = new CronService();
