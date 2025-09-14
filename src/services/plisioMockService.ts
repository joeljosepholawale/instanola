/**
 * Mock Plisio Service for Local Development
 * This service provides mock responses when Firebase Functions are not available
 */

import { PlisioInvoice } from './plisioService';

export class PlisioMockService {
  private userId: string;
  private mockInvoices?: Map<string, PlisioInvoice>;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Mock fee estimation
   */
  async getFeeEstimation(currency: string, amount: number): Promise<{ fee: number }> {
    console.log(`[MOCK] Getting fee estimation for ${currency} ${amount}`);
    
    // Return mock fee based on currency
    const fees: { [key: string]: number } = {
      'BTC': 0.0005,
      'ETH': 0.01,
      'USDT': 2.00,
      'LTC': 0.01,
      'BCH': 0.01
    };
    
    const fee = fees[currency] || 1.00;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ fee });
      }, 1000); // Simulate network delay
    });
  }

  /**
   * Mock invoice creation
   */
  async createInvoice(request: { amount: number; currency: string; userEmail?: string; userName?: string }): Promise<PlisioInvoice> {
    console.log(`[MOCK] Creating invoice for ${request.amount} ${request.currency}`);
    
    // Initialize mock invoices map if not exists
    if (!this.mockInvoices) {
      this.mockInvoices = new Map();
    }
    
    const mockInvoice: PlisioInvoice = {
      id: `mock_invoice_${Date.now()}`,
      amount: request.amount,
      currency: request.currency,
      walletAddress: this.generateMockAddress(request.currency),
      qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5NT0NLIFFSPC90ZXh0Pjwvc3ZnPg==',
      invoiceUrl: `https://plisio.net/invoice/mock_${Date.now()}`,
      status: 'pending',
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes from now
    };
    
    // Store the invoice for later retrieval
    this.mockInvoices.set(mockInvoice.id, mockInvoice);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[MOCK] Invoice created:`, mockInvoice);
        resolve(mockInvoice);
      }, 1500); // Simulate network delay
    });
  }

  /**
   * Mock invoice status check
   */
  async getInvoice(invoiceId: string): Promise<PlisioInvoice> {
    console.log(`[MOCK] Checking status for invoice ${invoiceId}`);
    
    // Store mock invoices in memory for this session
    if (!this.mockInvoices) {
      this.mockInvoices = new Map();
    }
    
    // Check if we have this invoice stored
    let mockInvoice = this.mockInvoices.get(invoiceId);
    
    if (!mockInvoice) {
      // Create a basic mock invoice if not found
      const created = Date.now();
      mockInvoice = {
        id: invoiceId,
        amount: 10, // Default amount
        currency: 'USDT',
        walletAddress: this.generateMockAddress('USDT'),
        status: 'pending' as const,
        expiresAt: created + (30 * 60 * 1000)
      };
      this.mockInvoices.set(invoiceId, mockInvoice);
    }
    
    // Update status based on time elapsed since creation
    const created = parseInt(invoiceId.split('_').pop() || Date.now().toString());
    const elapsed = Date.now() - created;
    
    if (elapsed > 300000) { // 5 minutes
      mockInvoice.status = 'expired';
    } else if (elapsed > 120000) { // 2 minutes - simulate payment completion
      mockInvoice.status = 'completed';
    } else {
      mockInvoice.status = 'pending';
    }
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[MOCK] Invoice status:`, mockInvoice);
        resolve(mockInvoice!);
      }, 800);
    });
  }

  /**
   * Generate mock wallet addresses
   */
  private generateMockAddress(currency: string): string {
    const addresses: { [key: string]: string } = {
      'BTC': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'ETH': '0x742d35Cc6635C0532925a3b8D400e401e57e4c5E',
      'USDT': 'TQrfqpqqjseQv8e7SN4SJ7ry5vchMvdaui',
      'LTC': 'LTC123456789ABCDEFGHIJKLMNOP',
      'BCH': 'BCH123456789ABCDEFGHIJKLMNOP'
    };
    
    return addresses[currency] || `${currency}123456789ABCDEFGH`;
  }

  /**
   * Create instance (same interface as real service)
   */
  static createInstance(userId: string): PlisioMockService {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return new PlisioMockService(userId);
  }
}
