import React, { useState } from 'react';
import { Bitcoin, CheckCircle, Clock, Copy } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { PlisioService } from '../../services/plisioService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export function CryptoPaymentDemo() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const createTestPayment = async () => {
    if (!user) {
      error('Login Required', 'Please log in to test crypto payments');
      return;
    }

    try {
      setLoading(true);
      
      const testInvoice = await PlisioService.createInvoice({
        userId: user.id,
        amount: 5, // $5 test payment
        currency: 'BTC',
        userEmail: user.email,
        userName: user.name || 'User'
      });
      
      setInvoice(testInvoice);
      success('Test Invoice Created', 'Crypto payment invoice created successfully');
    } catch (err) {
      console.error('Error creating test payment:', err);
      error('Creation Failed', err instanceof Error ? err.message : 'Failed to create test payment');
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async () => {
    if (!invoice) return;

    try {
      await PlisioService.simulateWebhook(invoice.id, 'completed');
      success('Payment Simulated', 'Test payment has been marked as completed');
      setInvoice(null);
    } catch (err) {
      console.error('Error simulating payment:', err);
      error('Simulation Failed', 'Failed to simulate payment completion');
    }
  };

  const copyAddress = () => {
    if (invoice?.walletAddress) {
      navigator.clipboard.writeText(invoice.walletAddress);
      success('Copied!', 'Wallet address copied to clipboard');
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center">
        <Bitcoin className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Crypto Payment Demo</h3>
        <p className="text-gray-600 mb-6">Test the direct Plisio integration</p>

        {!invoice ? (
          <Button onClick={createTestPayment} disabled={loading} size="lg">
            {loading ? 'Creating...' : 'Create Test Payment ($5)'}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Test Invoice Created</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Amount:</strong> {invoice.amount} {invoice.currency}</p>
                <p><strong>Address:</strong></p>
                <div className="bg-white rounded p-2 font-mono text-xs break-all">
                  {invoice.walletAddress}
                </div>
                <div className="flex space-x-2 justify-center">
                  <Button size="sm" onClick={copyAddress}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Address
                  </Button>
                  <Button size="sm" onClick={simulatePayment} variant="outline">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Simulate Payment
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              This is a test payment. Use "Simulate Payment" to test the completion flow.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}