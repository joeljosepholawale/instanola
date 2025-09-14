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