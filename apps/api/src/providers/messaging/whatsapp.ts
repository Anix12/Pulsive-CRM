import { MessagingProvider, SendMessageParams, MessageResult } from './types';
import { AppError } from '@/middleware/errorHandler';

export class WhatsAppProvider implements MessagingProvider {
  readonly name = 'meta';
  readonly channel = 'WHATSAPP' as const;

  constructor(
    private accessToken: string,
    private phoneNumberId: string,
  ) {}

  async send(params: SendMessageParams): Promise<MessageResult> {
    const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      to: params.to.replace('+', ''),
      type: 'text',
      text: { body: params.body },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json() as any;
      throw new AppError(502, 'MESSAGING_PROVIDER_ERROR', err?.error?.message || 'WhatsApp send failed');
    }

    const data = await response.json() as any;
    return {
      providerMessageId: data.messages?.[0]?.id || '',
      status: 'sent',
    };
  }
}
