export interface User {
  id: string;
  email: string;
  name: string;
  walletBalance: number;
  isAdmin: boolean;
  createdAt: Date;
}

export interface VirtualNumber {
  id: string;
  userId: string;
  number: string;
  country: string;
  operator: string;
  service: string;
  status: 'active' | 'expired' | 'released';
  rentedAt: Date;
  expiresAt: Date;
  cost: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'purchase' | 'refund';
  amount: number;
  amountNGN?: number;
  currency?: 'USD' | 'NGN';
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: 'paymentpoint' | 'nowpayments';
  createdAt: Date;
}

export interface SMSMessage {
  id: string;
  numberId: string;
  from: string;
  message: string;
  receivedAt: Date;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  operators: Operator[];
}

export interface Operator {
  id: string;
  name: string;
  services: Service[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  available: boolean;
}
export interface PaymentPointAccount {
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentPointCustomerId: string;
  reservedAccountId: string;
  createdAt: Date;
  isActive: boolean;
  provider: string;
}

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