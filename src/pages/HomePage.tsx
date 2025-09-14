import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Shield, 
  Zap, 
  Globe, 
  ArrowRight,
  CheckCircle,
  Star,
  Clock,
  Users,
  Smartphone,
  CreditCard,
  Timer,
  Phone,
  TrendingUp,
  Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function HomePage() {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-amber-500" />,
      title: 'Instant Activation',
      description: 'Numbers activated in under 5 seconds. Lightning-fast SMS delivery with real-time notifications.',
      gradient: 'from-amber-100 to-yellow-100'
    },
    {
      icon: <Shield className="w-8 h-8 text-emerald-600" />,
      title: 'Military-Grade Security',
      description: 'End-to-end encryption, secure data handling, and complete privacy protection for all your messages.',
      gradient: 'from-emerald-100 to-green-100'
    },
    {
      icon: <Globe className="w-8 h-8 text-emerald-700" />,
      title: '150+ Countries',
      description: 'Largest global network with premium numbers from major carriers in every continent.',
      gradient: 'from-green-100 to-emerald-100'
    },
    {
      icon: <CreditCard className="w-8 h-8 text-amber-600" />,
      title: 'Smart Payments',
      description: 'PaymentPoint Naira deposits or crypto USD payments. Lowest fees, highest reliability.',
      gradient: 'from-yellow-100 to-amber-100'
    },
    {
      icon: <Timer className="w-8 h-8 text-emerald-500" />,
      title: 'Auto-Renewal',
      description: 'Never miss a message with intelligent auto-renewal and smart notification systems.',
      gradient: 'from-teal-100 to-emerald-100'
    },
    {
      icon: <Layers className="w-8 h-8 text-green-600" />,
      title: 'API Integration',
      description: 'Developer-friendly API with webhooks, bulk operations, and comprehensive documentation.',
      gradient: 'from-green-100 to-emerald-100'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Create Account',
      description: 'Register in 30 seconds with email verification. No credit card required to start exploring.',
      icon: <Users className="w-6 h-6" />
    },
    {
      step: '02', 
      title: 'Fund Wallet',
      description: 'Deposit via PaymentPoint (Naira) or crypto (USD). Minimum ₦500 or $2 to get started.',
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      step: '03',
      title: 'Choose Number',
      description: 'Browse 150+ countries, filter by service, check real-time pricing and availability.',
      icon: <Smartphone className="w-6 h-6" />
    },
    {
      step: '04', 
      title: 'Receive SMS',
      description: 'Get instant notifications, view messages in dashboard, export or forward as needed.',
      icon: <MessageSquare className="w-6 h-6" />
    }
  ];



  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-center items-center">
            
            {/* Main Content */}
            <div className="text-center max-w-4xl">

              
              <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 leading-tight">
                Get <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">Virtual</span>
                <br />Phone Numbers
                <br />in <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Seconds</span>
              </h1>
              
              <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
                Receive SMS verification codes from <span className="font-bold text-emerald-300">150+ countries</span> instantly. 
                Built for developers, businesses, and individuals who need reliable virtual numbers.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
                <Link to="/signup">
                  <Button size="xl" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border-0">
                    <Zap className="mr-2 w-6 h-6" />
                    Start Free Today
                    <ArrowRight className="ml-2 w-6 h-6" />
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                    <Phone className="mr-2 w-5 h-5" />
                    How It Works
                  </Button>
                </Link>
              </div>
              
              {/* Key Features Pills */}
              <div className="flex flex-wrap gap-3 text-sm justify-center">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white font-medium">5-Second Activation</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  <span className="text-white font-medium">99.9% Success Rate</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-white font-medium">24/7 Support</span>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-white via-emerald-50/30 to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-100 to-amber-100 rounded-full text-emerald-800 text-sm font-bold mb-8">
              <Star className="w-4 h-4 mr-2" />
              Why InstantNums Leads the Industry
            </div>
            <h2 className="text-5xl lg:text-6xl font-black text-gray-900 mb-8 leading-tight">
              Built for <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">Speed</span>,
              <br />Designed for <span className="bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">Scale</span>
            </h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              The most advanced SMS reception platform with enterprise-grade infrastructure, 
              built specifically for Nigerian users and global businesses.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 border-0 bg-white/90 backdrop-blur-sm group overflow-hidden relative">
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-emerald-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg px-2">
                  {feature.description}
                </p>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-amber-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full text-emerald-800 text-sm font-bold mb-8">
              <Zap className="w-4 h-4 mr-2" />
              Lightning Fast Setup Process
            </div>
            <h2 className="text-5xl lg:text-6xl font-black text-gray-900 mb-8 leading-tight">
              Start Receiving SMS in 
              <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent"> Under 60 Seconds</span>
            </h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Our streamlined process gets you up and running faster than any competitor. 
              No lengthy verification, no hidden fees, no complications.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative group">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl font-black shadow-2xl relative group-hover:scale-110 transition-all duration-300">
                  {step.step}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg group-hover:bg-amber-300 transition-colors">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-emerald-700 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-xs mx-auto text-lg">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-12 z-10">
                    <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"></div>
                    <ArrowRight className="w-6 h-6 text-emerald-500 absolute -right-3 -top-2.5 bg-white rounded-full p-1 shadow-lg" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-20">
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-3xl p-12 max-w-4xl mx-auto text-white shadow-2xl">
              <h3 className="text-3xl font-bold mb-6">Ready to Experience the Difference?</h3>
              <p className="text-xl mb-8 opacity-90 leading-relaxed">
                Join thousands of satisfied users who switched to InstantNums for faster, 
                more reliable SMS verification services.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/signup">
                  <Button className="w-full sm:w-auto bg-white text-emerald-700 hover:bg-gray-100 shadow-xl" size="xl">
                    <Zap className="mr-2 w-5 h-5" />
                    Get Started Now
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto border-3 border-white/30 text-white hover:bg-white/10">
                    Compare Plans
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-600/20 backdrop-blur-3xl"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-6xl font-black mb-6 leading-tight">
              Trusted by <span className="bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent">100,000+</span>
              <br />Users Worldwide
            </h2>
            <p className="text-2xl text-emerald-100 max-w-3xl mx-auto leading-relaxed">
              Join the largest community of developers, businesses, and individuals 
              who trust InstantNums for their SMS verification needs.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
              <div className="text-6xl font-black mb-4 bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform">150+</div>
              <div className="text-emerald-100 font-bold text-lg">Countries Available</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
              <div className="text-6xl font-black mb-4 bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform">99.9%</div>
              <div className="text-emerald-100 font-bold text-lg">Success Rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
              <div className="text-6xl font-black mb-4 bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform">5s</div>
              <div className="text-emerald-100 font-bold text-lg">Average Delivery</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
              <div className="text-6xl font-black mb-4 bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-emerald-100 font-bold text-lg">Support Available</div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-4xl mx-auto border border-white/20">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-12">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-black text-white mb-1">2M+</div>
                    <div className="text-emerald-200 font-semibold">SMS Messages Processed</div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-black text-white mb-1">500+</div>
                    <div className="text-emerald-200 font-semibold">Enterprise Clients</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-amber-50"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 rounded-3xl p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-amber-600/20"></div>
            <div className="relative">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full text-gray-900 text-sm font-black mb-8">
                <Zap className="w-4 h-4 mr-2" />
                Start Your Journey Today
              </div>
              
              <h2 className="text-5xl lg:text-7xl font-black mb-8 leading-tight">
                Ready to Go
                <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent"> Instant</span>?
              </h2>
              
              <p className="text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                Join <span className="font-bold text-emerald-400">100,000+ satisfied users</span> who chose InstantNums 
                for the most reliable, fastest, and affordable SMS verification platform in Nigeria.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-8 justify-center mb-12">
                <Link to="/signup">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105" size="xl">
                    <Zap className="mr-3 w-6 h-6" />
                    Get Started Free
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto border-3 border-white/30 text-white hover:bg-white/10 shadow-xl">
                    <Users className="mr-2 w-5 h-5" />
                    Talk to Expert
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-900" />
                  </div>
                  <span className="text-gray-300 font-semibold text-lg">No Setup Fees</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-900" />
                  </div>
                  <span className="text-gray-300 font-semibold text-lg">Cancel Anytime</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-900" />
                  </div>
                  <span className="text-gray-300 font-semibold text-lg">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
