import Twilio from 'twilio';
import { MessagingProvider, SendMessageParams, MessageResult } from './types';
import { AppError } from '@/middleware/errorHandler';

export class TwilioSmsProvider implements MessagingProvider {
  readonly name = 'twilio';
  readonly channel = 'SMS' as const;
  private client: Twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = Twilio(accountSid, authToken);
  }

  async send(params: SendMessageParams): Promise<MessageResult> {
    try {
      const message = await this.client.messages.create({
        to: params.to,
        from: params.from,
        body: params.body,
        ...(params.mediaUrl ? { mediaUrl: [params.mediaUrl] } : {}),
      });
      return { providerMessageId: message.sid, status: message.status };
    } catch (err: any) {
      throw new AppError(502, 'MESSAGING_PROVIDER_ERROR', err.message);
    }
  }
}
