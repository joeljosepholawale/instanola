import React, { useState } from 'react';
import { Mail, MessageCircle, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SupportModal } from '../components/ui/SupportModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { SupportService } from '../services/supportService';

export function ContactPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      error('Validation Error', 'Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      error('Invalid Email', 'Please enter a valid email address');
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('Submitting contact form with data:', formData);
      
      // Submit as support request
      const messageId = await SupportService.submitSupportRequest({
        userId: user?.id || 'anonymous',
        userName: formData.name,
        userEmail: formData.email,
        subject: formData.subject,
        message: formData.message,
        category: 'other',
        priority: 'medium'
      });
      
      console.log('Message submitted successfully with ID:', messageId);
      
      // Show success message
      success(
        'Message Sent Successfully!', 
        'We received your message and will respond within 24 hours.'
      );
      
      // Show browser alert for immediate feedback
      alert('Message sent successfully! We will respond within 24 hours.');
      
      // Reset form
      setFormData({ name: '', email: '', subject: '', message: '' });
      
    } catch (submitError) {
      console.error('Error submitting contact form:', submitError);
      console.error('Full error details:', {
        message: submitError instanceof Error ? submitError.message : 'Unknown error',
        stack: submitError instanceof Error ? submitError.stack : undefined,
        submitError
      });
      error(
        'Failed to Send Message', 
        submitError instanceof Error ? submitError.message : 'Please try again later.'
      );
    } finally {
      setSubmitting(false);
      console.log('Form submission completed, submitting state reset');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6 text-blue-600" />,
      title: 'Email Support',
      description: 'Get help via email',
      contact: 'support@instantnums.com',
      action: 'Send Email'
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-green-500" />,
      title: 'Telegram',
      description: 'Quick chat support',
      contact: '@InstantNums_Support',
      action: 'Start Chat'
    },
    {
      icon: <Phone className="w-6 h-6 text-purple-600" />,
      title: 'WhatsApp',
      description: 'Message us on WhatsApp',
      contact: '+1 (555) 123-4567',
      action: 'Send Message'
    }
  ];

  const faqs = [
    {
      question: 'How do I get started with virtual numbers?',
      answer: 'Simply create a free account, fund your wallet, and choose a virtual number from our available countries and operators. The process takes less than 5 minutes.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept local payments through PaymentPoint and cryptocurrency payments via NowPayments, including Bitcoin, Ethereum, and other major cryptocurrencies.'
    },
    {
      question: 'How long do numbers stay active?',
      answer: 'Virtual numbers typically stay active for 20-30 minutes for verification. You can extend the duration or rent numbers for longer periods through your dashboard.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Refunds are available for unused numbers or in case of service issues. Please contact our support team within 24 hours of your purchase.'
    },
    {
      question: 'Is there an API for developers?',
      answer: 'Yes! We provide a comprehensive API for developers who want to integrate virtual numbers into their applications. API documentation is available in your dashboard.'
    },
    {
      question: 'What countries and services are supported?',
      answer: 'We support 100+ countries and major services including Telegram, WhatsApp, Instagram, Facebook, Twitter, Discord, and many more.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're here to help! Reach out to our support team for any questions 
            about virtual numbers, pricing, or technical assistance.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Your Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your name"
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                  <Input
                    label="Subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="What can we help you with?"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Tell us more about your question or issue..."
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full md:w-auto">
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Sending Message...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* Contact Methods & Info */}
          <div className="space-y-8">
            {/* Contact Methods */}
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Methods</h3>
                <div className="space-y-4">
                  {contactMethods.map((method, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-shrink-0">
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{method.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                        <p className="text-sm font-medium text-blue-600">{method.contact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Office Info */}
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Office Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Headquarters</p>
                      <p className="text-sm text-gray-600">
                        123 Tech Street<br />
                        San Francisco, CA 94107<br />
                        United States
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Support Hours</p>
                      <p className="text-sm text-gray-600">
                        24/7 Support Available<br />
                        Response within 1-2 hours
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions about our services.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Need Immediate Assistance?</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            For urgent issues or immediate support, submit a support ticket or reach out via Telegram. 
            Our support team is available 24/7 to help you with any questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user && (
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => setShowSupportModal(true)}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Submit Support Ticket
              </Button>
            )}
            <Button variant="secondary" size="lg">
              <MessageCircle className="w-5 h-5 mr-2" />
              Contact on Telegram
            </Button>
          </div>
          {!user && (
            <p className="text-blue-200 text-sm mt-4">
              Please log in to submit a support ticket
            </p>
          )}
        </div>
      </div>

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        onSuccess={() => {
          // Optionally show success message or refresh page
        }}
      />
    </div>
  );
}