// Multi-tenant types for Firebase Functions

export interface PaymentPointWebhookData {
  notification_status: string;
  transaction_id: string;
  amount_paid: number;
  settlement_amount: number;
  settlement_fee: number;
  transaction_status: string;
  sender: {
    name: string;
    account_number: string;
    bank: string;
  };
  receiver: {
    name: string;
    account_number: string;
    bank: string;
    customer_id: string; // This will now include site prefix
  };
  customer: {
    name: string;
    email: string;
    phone?: string;
    customer_id: string;
  };
  description: string;
  timestamp: string;
}

export interface MultiTenantPaymentRequest {
  userId: string;
  siteId?: string; // Optional for backward compatibility
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface SiteSpecificTransaction {
  userId: string;
  siteId: string;
  type: 'deposit' | 'purchase' | 'refund';
  amount: number;
  originalAmount?: number;
  feeAmount?: number;
  currency: 'USD' | 'NGN';
  provider: 'paymentpoint' | 'nowpayments' | 'manual';
  paymentReference?: string;
  senderName?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any; // FieldValue.serverTimestamp()
}