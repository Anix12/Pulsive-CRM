import { RazorpayProvider } from './razorpay';
import { PaymentProvider } from './types';
import { env } from '@/config/env';
import { AppError } from '@/middleware/errorHandler';

export type { PaymentProvider, CreateOrderParams, OrderResult } from './types';

export const getPaymentProvider = (): PaymentProvider => {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return new RazorpayProvider(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
  }
  throw new AppError(500, 'PAYMENT_NOT_CONFIGURED', 'No payment provider is configured');
};
