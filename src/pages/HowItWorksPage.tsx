import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  CreditCard, 
  Smartphone, 
  MessageSquare,
  ArrowDown,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function HowItWorksPage() {
  const steps = [
    {
      icon: <UserPlus className="w-8 h-8 text-blue-600" />,
      title: 'Create Your Account',
      description: 'Sign up for free with just your email address. No complex verification required.',
      details: [
        'Quick 2-minute registration process',
        'Email verification for security',
        'Access to your personal dashboard',
        'Free account with no monthly fees'
      ],
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <CreditCard className="w-8 h-8 text-green-500" />,
      title: 'Fund Your Wallet',
      description: 'Add funds using our secure payment methods. Start with as little as $1.',
      details: [
        'PaymentPoint for local payments',
        'NowPayments for cryptocurrency',
        'Instant wallet credit',
        'Secure transaction processing'
      ],
      color: 'from-green-500 to-green-600'
    },
    {
      icon: <Smartphone className="w-8 h-8 text-purple-600" />,
      title: 'Choose Your Number',
      description: 'Select from 100+ countries and multiple operators for your virtual number.',
      details: [
        'Real-time availability checking',
        'Filter by country and operator',
        'Transparent pricing display',
        'Instant number reservation'
      ],
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-orange-600" />,
      title: 'Receive & Manage SMS',
      description: 'Get SMS codes instantly and manage all your virtual numbers in one place.',
      details: [
        'Real-time SMS delivery',
        'Dashboard message management',
        'Extend or release numbers',
        'Download message history'
      ],
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const features = [
    {
      icon: <Clock className="w-6 h-6 text-blue-600" />,
      title: 'Instant Activation',
      description: 'Numbers are activated immediately upon purchase'
    },
    {
      icon: <Shield className="w-6 h-6 text-green-500" />,
      title: 'Secure & Private',
      description: 'Your data and messages are encrypted and protected'
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-purple-600" />,
      title: '99.9% Reliability',
      description: 'Guaranteed uptime with redundant infrastructure'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
            How ProxyNumSMS Works
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get virtual SMS numbers in 4 simple steps. Our streamlined process 
            makes it easy to start receiving verification codes instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Now
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={index}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className={`order-2 ${index % 2 === 1 ? 'lg:order-1' : 'lg:order-2'}`}>
                    <div className="text-center lg:text-left">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${step.color} text-white mb-6`}>
                        {step.icon}
                      </div>
                      <div className="flex items-center justify-center lg:justify-start mb-4">
                        <span className="text-lg font-semibold text-gray-400 mr-4">
                          Step {index + 1}
                        </span>
                        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-lg text-gray-600 mb-6">
                        {step.description}
                      </p>
                      <ul className="space-y-2">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-center justify-center lg:justify-start space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-gray-600">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className={`order-1 ${index % 2 === 1 ? 'lg:order-2' : 'lg:order-1'}`}>
                    <div className="relative">
                      <Card className="p-8 max-w-md mx-auto">
                        <div className="text-center">
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center mx-auto mb-4`}>
                            {React.cloneElement(step.icon, { className: "w-10 h-10 text-white" })}
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {step.title}
                          </h4>
                          {/* Mock UI elements based on step */}
                          {index === 0 && (
                            <div className="space-y-3">
                              <div className="bg-gray-100 rounded-lg p-3">
                                <input placeholder="Enter your email" className="w-full bg-transparent text-sm" readOnly />
                              </div>
                              <Button className="w-full" size="sm">Create Account</Button>
                            </div>
                          )}
                          {index === 1 && (
                            <div className="space-y-3">
                              <div className="bg-green-50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600">$25.00</div>
                                <div className="text-sm text-gray-600">Wallet Balance</div>
                              </div>
                              <div className="flex space-x-2">
                                <Button size="sm" className="flex-1">PaymentPoint</Button>
                                <Button variant="outline" size="sm" className="flex-1">Crypto</Button>
                              </div>
                            </div>
                          )}
                          {index === 2 && (
                            <div className="space-y-3">
                              <div className="bg-blue-50 rounded-lg p-3">
                                <div className="text-sm text-gray-600 mb-1">Country: United States 🇺🇸</div>
                                <div className="text-sm text-gray-600 mb-1">Service: Telegram</div>
                                <div className="font-semibold text-blue-600">$0.25</div>
                              </div>
                              <Button size="sm" className="w-full">Rent Number</Button>
                            </div>
                          )}
                          {index === 3 && (
                            <div className="space-y-3">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="font-mono text-lg text-blue-600">+1 (555) 123-4567</div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3 text-left">
                                <div className="text-xs text-gray-500 mb-1">From: Telegram</div>
                                <div className="text-sm font-medium">Code: 123456</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="flex justify-center mt-8">
                    <ArrowDown className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How ProxyNum Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've optimized every step to ensure you get virtual numbers 
              quickly, securely, and reliably.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              {
                question: 'How quickly can I get a virtual number?',
                answer: 'Virtual numbers are activated instantly upon successful payment. The entire process from signup to receiving your first SMS typically takes less than 5 minutes.'
              },
              {
                question: 'What payment methods do you accept?',
                answer: 'We accept local payments through PaymentPoint and cryptocurrency payments via NowPayments. This includes major cryptocurrencies like Bitcoin, Ethereum, and more.'
              },
              {
                question: 'How long do virtual numbers stay active?',
                answer: 'Virtual numbers typically stay active for 20-30 minutes for verification purposes. You can extend the duration or rent numbers for longer periods through our dashboard.'
              },
              {
                question: 'Can I use the same number multiple times?',
                answer: 'Each number rental is for single-use verification. However, you can rent new numbers as many times as needed for different services or verification attempts.'
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Your Virtual Number?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who trust our platform for their verification needs.
          </p>
          <Link to="/signup">
            <Button variant="secondary" size="lg">
              Start Now - It's Free!
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}