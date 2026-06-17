// packages/shared-types/src/dtos/challenge.dto.ts

import { z } from 'zod';

export const ChallengeTeamSchema = z.object({
  name: z.string(),
  members: z.array(z.number())
});

export const ChallengeSchema = z.object({
  tenantId: z.string(),
  type: z.enum(['group', 'individual']),
  startDateText: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  durationDays: z.number(),
  teams: z.array(ChallengeTeamSchema),
  status: z.enum(['pending', 'active', 'completed']).default('pending'),
  lastLeaderboardMessageId: z.number().optional(),
  lastDividerMessageId: z.number().optional() // 👈 فیلد جدید اضافه شد
});

export type ChallengeDto = z.infer<typeof ChallengeSchema>;
