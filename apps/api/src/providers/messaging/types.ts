export interface SendMessageParams {
  to: string;
  from: string;
  body: string;
  mediaUrl?: string;
}

export interface MessageResult {
  providerMessageId: string;
  status: string;
}

export interface MessagingProvider {
  readonly name: string;
  readonly channel: 'SMS' | 'WHATSAPP';
  send(params: SendMessageParams): Promise<MessageResult>;
}
