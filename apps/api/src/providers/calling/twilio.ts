import Twilio from 'twilio';
import { CallingProvider, InitiateCallParams, CallResult } from './types';
import { AppError } from '@/middleware/errorHandler';

export class TwilioCallingProvider implements CallingProvider {
  readonly name = 'twilio';
  private client: Twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = Twilio(accountSid, authToken);
  }

  async initiateCall(params: InitiateCallParams): Promise<CallResult> {
    try {
      const call = await this.client.calls.create({
        to: params.to,
        from: params.from,
        statusCallback: params.statusCallbackUrl,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: params.recordingEnabled ?? false,
      });
      return { providerCallSid: call.sid, status: call.status };
    } catch (err: any) {
      throw new AppError(502, 'CALLING_PROVIDER_ERROR', err.message);
    }
  }

  async endCall(providerCallSid: string): Promise<void> {
    try {
      await this.client.calls(providerCallSid).update({ status: 'completed' });
    } catch (err: any) {
      throw new AppError(502, 'CALLING_PROVIDER_ERROR', err.message);
    }
  }

  async getCallStatus(providerCallSid: string): Promise<string> {
    const call = await this.client.calls(providerCallSid).fetch();
    return call.status;
  }

  async getRecordingUrl(recordingSid: string): Promise<string> {
    const recording = await this.client.recordings(recordingSid).fetch();
    return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
  }
}
