export interface CreateOrderParams {
  amount: number; // in smallest unit (paise for INR, cents for USD)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentProvider {
  readonly name: string;
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyWebhook(payload: string, signature: string): boolean;
}
