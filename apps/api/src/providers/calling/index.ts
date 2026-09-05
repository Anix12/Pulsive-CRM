import { TwilioCallingProvider } from './twilio';
import { CallingProvider } from './types';
import { decrypt } from '@/utils/crypto';
import { AppError } from '@/middleware/errorHandler';

export type { CallingProvider, InitiateCallParams, CallResult } from './types';

interface TenantCallingConfig {
  provider: string;
  accountSid: string;
  authToken: string; // encrypted
  phoneNumber: string;
}

export const getCallingProvider = (config: TenantCallingConfig): CallingProvider => {
  const authToken = decrypt(config.authToken);

  switch (config.provider) {
    case 'twilio':
      return new TwilioCallingProvider(config.accountSid, authToken);
    default:
      throw new AppError(500, 'UNSUPPORTED_PROVIDER', `Calling provider "${config.provider}" not supported`);
  }
};
