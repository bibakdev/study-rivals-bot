// apps/backend/src/modules/challenge/services/daily-report.service.ts

import { IChallengeDocument } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import {
  formatMinutesToTime,
  formatPersianDateLabel
} from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

interface ReportUser {
  telegramId: number;
  name: string;
  teamName: string;
  loggedMinutes: number;
  targetMinutes: number;
}

class DailyReportService {
  /**
   * تولید متن گزارش پایان روز برای یک چالش خاص
   * @param challenge داکیومنت چالش فعال
   * @param reportDayIndex ایندکس روزی که به پایان رسیده است
   * @param targetDate تاریخ دقیق روزی که به پایان رسیده (برای کوئری دیتابیس)
   */
  public async generateReportText(
    challenge: IChallengeDocument,
    reportDayIndex: number,
    targetDate: Date
  ): Promise<string | null> {
    try {
      const allMemberIds = challenge.teams.flatMap((t) => t.members);
      if (allMemberIds.length === 0) return null;

      // ۱. واکشی تایم‌های ثبت شده فقط برای همان روز خاص
      const timeLogs = await TimeLogModel.find({
        challengeId: challenge._id,
        date: targetDate
      }).lean();

      // ۲. واکشی اطلاعات هویتی کاربران (نام اصلی و نام مستعار)
      const usersInfo = await UserModel.find({
        telegramId: { $in: allMemberIds }
      }).lean();
      const tenantMembers = await TenantMemberModel.find({
        tenantId: challenge.tenantId,
        telegramId: { $in: allMemberIds }
      }).lean();

      // ۳. آرایه‌های مجزا برای دسته‌بندی کاربران
      const successUsers: ReportUser[] = []; // ✅
      const partialUsers: ReportUser[] = []; // 🍌
      const zeroUsers: ReportUser[] = []; // 🍆

      // ۴. پردازش و دسته‌بندی هر کاربر
      challenge.teams.forEach((team) => {
        team.members.forEach((memberId) => {
          const user = usersInfo.find((u) => u.telegramId === memberId);
          const membership = tenantMembers.find(
            (m) => m.telegramId === memberId
          );

          // اولویت با نام مستعار است
          let name = 'کاربر';
          if (membership?.alias) {
            name = membership.alias;
          } else if (user) {
            name =
              `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim();
          }

          // استخراج تایم ثبت شده
          const log = timeLogs.find((l) => l.telegramId === memberId);
          const loggedMinutes = log ? log.minutes : 0;

          // استخراج تارگت فریز شده کاربر در این چالش
          const participantTarget = challenge.participantTargets?.find(
            (t) => t.telegramId === memberId
          );
          const targetMinutes = participantTarget
            ? participantTarget.target
            : 0;

          const reportUser: ReportUser = {
            telegramId: memberId,
            name,
            teamName: team.name,
            loggedMinutes,
            targetMinutes
          };

          // منطق تخصیص لیبل‌ها
          if (loggedMinutes > 0 && loggedMinutes >= targetMinutes) {
            successUsers.push(reportUser);
          } else if (loggedMinutes > 0 && loggedMinutes < targetMinutes) {
            partialUsers.push(reportUser);
          } else {
            zeroUsers.push(reportUser);
          }
        });
      });

      // ۵. مرتب‌سازی (Sorting) طبق قوانین درخواستی
      // تیک‌ها و موزها: بر اساس بیشترین تایم ثبت شده (نزولی)
      successUsers.sort((a, b) => b.loggedMinutes - a.loggedMinutes);
      partialUsers.sort((a, b) => b.loggedMinutes - a.loggedMinutes);
      // بادمجان‌ها: بر اساس بیشترین تارگت (نزولی)
      zeroUsers.sort((a, b) => b.targetMinutes - a.targetMinutes);

      // ۶. ساخت متن نهایی گزارش (Mobile-Friendly)
      const dateLabel = formatPersianDateLabel(targetDate);

      let report = `📅 **گزارش پایان روز ${reportDayIndex + 1} چالش**\n`;
      report += `🗓 *${dateLabel}*\n`;
      report += `➖➖➖➖➖➖➖➖➖\n`;

      const buildUserLine = (u: ReportUser, icon: string) => {
        return `${icon} **${u.name}** (${u.teamName})\n└ ⏱ ${formatMinutesToTime(u.loggedMinutes)} | 🎯 ${formatMinutesToTime(u.targetMinutes)}\n\n`;
      };

      successUsers.forEach((u) => {
        report += buildUserLine(u, '✅');
      });

      partialUsers.forEach((u) => {
        report += buildUserLine(u, '🍌');
      });

      zeroUsers.forEach((u) => {
        report += buildUserLine(u, '🍆');
      });

      report += `➖➖➖➖➖➖➖➖➖\n`;
      report += `**راهنمای وضعیت:**\n`;
      report += `✅ رسیدن به تارگت\n`;
      report += `🍌 ثبت تایم (کمتر از تارگت)\n`;
      report += `🍆 صفر مطلق (بدون ثبت تایم)`;

      return report;
    } catch (error) {
      logger.error('Error generating daily report text:', error);
      return null;
    }
  }
}

export const dailyReportService = new DailyReportService();
