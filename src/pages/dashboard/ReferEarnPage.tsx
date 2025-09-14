import React, { useState, useEffect } from 'react';
import {
  Users,
  Share2,
  DollarSign,
  Copy,
  Gift,
  TrendingUp,
  UserPlus,
  Wallet,
  CheckCircle,
  ExternalLink,
  Star
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { SEOHead } from '../../components/SEO/SEOHead';

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  pendingEarnings: number;
  totalEarned: number;
  referrals: Array<{
    id: string;
    email: string;
    status: 'pending' | 'qualified' | 'paid';
    depositAmount: number;
    earnedAmount: number;
    joinedAt: Date;
  }>;
}

export function ReferEarnPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    referralCount: 0,
    referralEarnings: 0,
    pendingEarnings: 0,
    totalEarned: 0,
    referrals: []
  });

  const REFERRAL_BONUS = 100; // ₦100 per qualified referral
  const MINIMUM_DEPOSIT = 1000; // ₦1,000 minimum deposit to qualify

  useEffect(() => {
    if (user) {
      console.log('User found, fetching referral data for:', user.id);
      fetchReferralData();
    } else {
      console.log('No user found, cannot fetch referral data');
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) {
      console.log('No user in fetchReferralData');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Starting fetchReferralData for user:', user.id);
      
      // Get user's referral data
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (!userDoc.exists()) {
        console.log('User document does not exist, creating it:', user.id);
        // Create user document with referral code
        const newReferralCode = generateReferralCode();
        await setDoc(doc(db, 'users', user.id), {
          email: user.email,
          name: user.name || '',
          referralCode: newReferralCode,
          createdAt: new Date(),
          walletBalanceNGN: 0,
          walletBalance: 0
        });
        
        // Set the referral data immediately
        setReferralData(prev => ({
          ...prev,
          referralCode: newReferralCode
        }));
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      console.log('User data retrieved:', userData);
      let referralCode = userData.referralCode;
      console.log('Existing referral code:', referralCode);
      
      // Create referral code if doesn't exist
      if (!referralCode) {
        referralCode = generateReferralCode();
        console.log('Generating new referral code:', referralCode);
        try {
          await updateDoc(doc(db, 'users', user.id), {
            referralCode: referralCode
          });
          console.log('Successfully saved new referral code to database');
        } catch (updateError) {
          console.error('Failed to save referral code, using generated code anyway:', updateError);
        }
      } else {
        console.log('Using existing referral code:', referralCode);
      }

      // Get referrals made by this user
      const referralsQuery = query(
        collection(db, 'users'),
        where('referredBy', '==', referralCode)
      );
      
      const referralsSnapshot = await getDocs(referralsQuery);
      const referrals = referralsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          status: data.totalDepositNGN >= MINIMUM_DEPOSIT ? 'qualified' : 'pending',
          depositAmount: data.totalDepositNGN || 0,
          earnedAmount: data.totalDepositNGN >= MINIMUM_DEPOSIT ? REFERRAL_BONUS : 0,
          joinedAt: data.createdAt?.toDate() || new Date()
        };
      });

      const qualifiedReferrals = referrals.filter(r => r.status === 'qualified');
      const pendingReferrals = referrals.filter(r => r.status === 'pending');

      const newReferralData = {
        referralCode,
        referralCount: referrals.length,
        referralEarnings: userData.referralEarningsAvailable || 0,
        pendingEarnings: pendingReferrals.length * REFERRAL_BONUS,
        totalEarned: userData.referralEarningsTotal || 0,
        referrals
      };

      console.log('Setting referral data:', newReferralData);
      setReferralData(newReferralData);
      
    } catch (err) {
      console.error('Error fetching referral data:', err);
      error('Error', 'Failed to load referral data');
      
      // Set a fallback referral code even if there's an error
      const fallbackCode = generateReferralCode();
      setReferralData(prev => ({
        ...prev,
        referralCode: fallbackCode
      }));
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    return `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const copyReferralLink = () => {
    if (!referralData.referralCode) {
      error('Error', 'Referral code not available yet. Please refresh the page.');
      return;
    }
    const referralLink = `https://instantnums.com/signup?ref=${referralData.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    success('Copied!', 'Referral link copied to clipboard');
  };

  const withdrawEarnings = async () => {
    if (!user || referralData.referralEarnings <= 0) return;

    try {
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;

      const currentBalance = userDoc.data().walletBalanceNGN || 0;
      
      // Add referral earnings to wallet balance and clear available earnings
      await updateDoc(userRef, {
        walletBalanceNGN: currentBalance + referralData.referralEarnings,
        referralEarningsAvailable: 0, // Clear available earnings
        referralEarningsWithdrawn: (userDoc.data().referralEarningsWithdrawn || 0) + referralData.referralEarnings
      });

      success('Success!', `₦${referralData.referralEarnings.toLocaleString()} added to your wallet`);
      fetchReferralData(); // Refresh data
      
    } catch (err) {
      console.error('Error withdrawing earnings:', err);
      error('Error', 'Failed to withdraw earnings');
    }
  };

  const shareReferralLink = () => {
    if (!referralData.referralCode) {
      error('Error', 'Referral code not available yet. Please refresh the page.');
      return;
    }
    const referralLink = `https://instantnums.com/signup?ref=${referralData.referralCode}`;
    const shareText = `Join InstantNums and get virtual numbers for SMS verification! Use my referral link: ${referralLink}`;
    
    // Check if Web Share API is supported and allowed
    if (navigator.share && navigator.canShare && navigator.canShare({ title: 'Join InstantNums', text: shareText, url: referralLink })) {
      try {
        navigator.share({
          title: 'Join InstantNums',
          text: shareText,
          url: referralLink
        }).catch((shareError) => {
          console.log('Share was cancelled or failed:', shareError);
          // Fallback to clipboard
          navigator.clipboard.writeText(shareText);
          success('Copied!', 'Referral message copied to clipboard');
        });
      } catch (shareError) {
        console.log('Share API error:', shareError);
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText);
        success('Copied!', 'Referral message copied to clipboard');
      }
    } else {
      // Direct fallback - copy to clipboard
      navigator.clipboard.writeText(shareText);
      success('Copied!', 'Referral message copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Refer & Earn"
        description="Earn money by referring friends to InstantNums. Get ₦100 for every friend who joins and makes a deposit."
        url="https://instantnums.com/dashboard/refer-earn"
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Refer & Earn</span>
          </h1>
          <p className="text-xl text-gray-600">Earn ₦100 for every friend who joins and deposits ₦1,000+</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{referralData.referralCount}</div>
                  <div className="text-sm text-gray-600">Total Referrals</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">₦{referralData.referralEarnings.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">₦{referralData.pendingEarnings.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">₦{referralData.totalEarned.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Share Referral */}
          <Card className="border-2 border-purple-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                <Share2 className="w-6 h-6 mr-3 text-purple-600" />
                Share Your Referral Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Your Referral Code:</div>
                  <div className="text-xl font-bold text-purple-600">
                    {referralData.referralCode ? referralData.referralCode : (loading ? 'Loading...' : 'Generating...')}
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={copyReferralLink}
                    disabled={!referralData.referralCode}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  
                  <Button
                    onClick={shareReferralLink}
                    disabled={!referralData.referralCode}
                    variant="outline"
                    className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdraw Earnings */}
          <Card className="border-2 border-green-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                <Wallet className="w-6 h-6 mr-3 text-green-600" />
                Withdraw Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 mb-2">Available to Withdraw:</div>
                  <div className="text-3xl font-bold text-green-700">₦{referralData.referralEarnings.toLocaleString()}</div>
                </div>
                
                <Button
                  onClick={withdrawEarnings}
                  disabled={referralData.referralEarnings <= 0}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Withdraw to Wallet
                </Button>
                
                {referralData.referralEarnings <= 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    No earnings available to withdraw
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="border-2 border-blue-200 shadow-xl mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">1. Share Your Link</h3>
                <p className="text-gray-600">Share your unique referral link with friends and family</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">2. Friend Deposits ₦1,000+</h3>
                <p className="text-gray-600">Your friend signs up and makes a deposit of ₦1,000 or more</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">3. Earn ₦100</h3>
                <p className="text-gray-600">You earn ₦100 that you can withdraw to your wallet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card className="border-2 border-gray-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {referralData.referrals.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Referrals Yet</h3>
                <p className="text-gray-600">Start sharing your referral link to earn rewards!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referralData.referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{referral.email}</div>
                        <div className="text-sm text-gray-500">
                          Joined: {referral.joinedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">₦{referral.depositAmount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Deposited</div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        referral.status === 'qualified' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {referral.status === 'qualified' ? (
                          <span className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Qualified
                          </span>
                        ) : (
                          'Pending'
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-green-600">₦{referral.earnedAmount}</div>
                        <div className="text-xs text-gray-500">Earned</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}

export default ReferEarnPage;
