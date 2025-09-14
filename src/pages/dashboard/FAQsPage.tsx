import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, MessageSquare, Phone, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function FAQsPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());

  const faqs: FAQ[] = [
    // General
    {
      id: 'what-is-proxynum',
      question: 'What is ProxyNumSMS?',
      answer: 'ProxyNumSMS is a service that provides virtual phone numbers for receiving SMS verifications. You can use these numbers to verify accounts on various platforms without using your personal phone number.',
      category: 'general'
    },
    {
      id: 'how-it-works',
      question: 'How does it work?',
      answer: 'Simply purchase a virtual number for your desired service (like WhatsApp, Telegram, etc.), use that number during account registration, and receive the SMS verification code on our platform.',
      category: 'general'
    },
    {
      id: 'countries-supported',
      question: 'Which countries are supported?',
      answer: 'We support numbers from multiple countries including USA, UK, Canada, Germany, France, and many more. You can see the full list of available countries on our numbers page.',
      category: 'general'
    },
    
    // Numbers & Services
    {
      id: 'number-duration',
      question: 'How long do I have to receive SMS?',
      answer: 'Most numbers are active for 20-30 minutes after purchase. Some services may have different time limits. If you don\'t receive the SMS within the time limit, you can get a refund.',
      category: 'numbers'
    },
    {
      id: 'multiple-sms',
      question: 'Can I receive multiple SMS on the same number?',
      answer: 'Regular numbers are for single-use only. However, you can purchase rental numbers which allow you to receive multiple SMS over a longer period (usually 7-30 days).',
      category: 'numbers'
    },
    {
      id: 'services-supported',
      question: 'Which services are supported?',
      answer: 'We support over 500+ services including WhatsApp, Telegram, Instagram, Facebook, Google, Amazon, Uber, and many more. You can see the full list when selecting a number.',
      category: 'numbers'
    },
    {
      id: 'number-not-working',
      question: 'What if the number doesn\'t work?',
      answer: 'If you don\'t receive the SMS within the time limit or the number is blocked by the service, you can request a refund through our support system. Refunds are processed automatically in most cases.',
      category: 'numbers'
    },

    // Payment & Wallet
    {
      id: 'payment-methods',
      question: 'What payment methods do you accept?',
      answer: 'We accept Nigerian bank transfers through our virtual accounts, cryptocurrency (Bitcoin, Ethereum, TRON), and manual payments through OPAY and bank transfers.',
      category: 'payment'
    },
    {
      id: 'minimum-deposit',
      question: 'What is the minimum deposit amount?',
      answer: 'The minimum deposit is $1 USD or ₦1,600 Naira. There is no maximum limit.',
      category: 'payment'
    },
    {
      id: 'instant-crediting',
      question: 'How fast are deposits credited?',
      answer: 'PaymentPoint deposits are credited instantly (2-5 minutes). Manual payments take 10-15 minutes for admin approval. Cryptocurrency payments are credited after confirmation (5-10 minutes).',
      category: 'payment'
    },
    {
      id: 'withdrawal',
      question: 'Can I withdraw unused funds?',
      answer: 'Currently, we don\'t offer direct withdrawals. However, you can use your wallet balance to purchase numbers or contact support for special cases.',
      category: 'payment'
    },

    // Account & Support
    {
      id: 'account-safety',
      question: 'Is my account safe?',
      answer: 'Yes, we use industry-standard security measures including encryption and secure authentication. We never store sensitive payment information.',
      category: 'account'
    },
    {
      id: 'api-access',
      question: 'Do you provide API access?',
      answer: 'Yes, we provide API access for developers. You can generate API keys from your dashboard and use them to automate number purchases and SMS retrieval.',
      category: 'account'
    },
    {
      id: 'bulk-discounts',
      question: 'Do you offer bulk discounts?',
      answer: 'Yes, we offer volume discounts for bulk purchases. Contact our support team for custom pricing on large orders.',
      category: 'account'
    }
  ];

  const categories = [
    { id: 'general', name: 'General', icon: HelpCircle },
    { id: 'numbers', name: 'Numbers & Services', icon: Phone },
    { id: 'payment', name: 'Payment & Wallet', icon: Wallet },
    { id: 'account', name: 'Account & Support', icon: MessageSquare }
  ];

  const toggleFAQ = (faqId: string) => {
    const newOpenFAQs = new Set(openFAQs);
    if (newOpenFAQs.has(faqId)) {
      newOpenFAQs.delete(faqId);
    } else {
      newOpenFAQs.add(faqId);
    }
    setOpenFAQs(newOpenFAQs);
  };

  const filteredFAQs = faqs.filter(faq => faq.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about ProxyNumSMS. Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center mb-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 m-1 rounded-lg font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.map((faq) => {
            const isOpen = openFAQs.has(faq.id);
            return (
              <Card key={faq.id} className="overflow-hidden">
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-4">
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Contact Support */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="p-6 text-center">
            <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-4">
              Our support team is here to help you with any questions or issues.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
