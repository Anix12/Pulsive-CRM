import { TwilioSmsProvider } from './twilio-sms';
import { WhatsAppProvider } from './whatsapp';
import { MessagingProvider } from './types';
import { decrypt } from '@/utils/crypto';
import { AppError } from '@/middleware/errorHandler';

export type { MessagingProvider, SendMessageParams, MessageResult } from './types';

interface TenantMessagingConfig {
  twilioAccountSid?: string;
  twilioAuthToken?: string; // encrypted
  whatsappAccessToken?: string; // encrypted
  whatsappPhoneNumberId?: string;
}

export const getSmsProvider = (config: TenantMessagingConfig): MessagingProvider => {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    throw new AppError(400, 'PROVIDER_NOT_CONFIGURED', 'Twilio SMS is not configured for this tenant');
  }
  return new TwilioSmsProvider(config.twilioAccountSid, decrypt(config.twilioAuthToken));
};

export const getWhatsAppProvider = (config: TenantMessagingConfig): MessagingProvider => {
  if (!config.whatsappAccessToken || !config.whatsappPhoneNumberId) {
    throw new AppError(400, 'PROVIDER_NOT_CONFIGURED', 'WhatsApp is not configured for this tenant');
  }
  return new WhatsAppProvider(decrypt(config.whatsappAccessToken), config.whatsappPhoneNumberId);
};
