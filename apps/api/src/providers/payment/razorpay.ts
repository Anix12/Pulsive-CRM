import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentProvider, CreateOrderParams, OrderResult } from './types';
import { AppError } from '@/middleware/errorHandler';

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private client: Razorpay;

  constructor(keyId: string, keySecret: string) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    try {
      const order = await this.client.orders.create({
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      });
      return {
        orderId: order.id,
        amount: order.amount as number,
        currency: order.currency,
        status: order.status,
      };
    } catch (err: any) {
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', err.message);
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expected === signature;
  }
}
