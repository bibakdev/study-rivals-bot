import crypto from 'crypto';
import { TenantModel } from '#modules/tenant/tenant.model';

export const generateUniqueLicense = async (): Promise<string> => {
  let code = '';
  let isCreated = false;
  let attempts = 0;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // اعتبار ۱ ساعته

  // مدیریت Edge Case: حلقه Retry برای جلوگیری از خطای Duplicate Key (11000)
  while (!isCreated && attempts < 3) {
    code = crypto.randomBytes(8).toString('hex').toUpperCase();
    try {
      await TenantModel.create({
        licenseCode: code,
        isBound: false,
        isActive: false,
        expiresAt
      });
      isCreated = true;
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        attempts++;
      } else {
        throw err; // خطای غیرمرتبط با تکراری بودن کد
      }
    }
  }

  if (!isCreated) {
    throw new Error(
      'Failed to generate a unique license code after 3 attempts.'
    );
  }

  return code;
};
