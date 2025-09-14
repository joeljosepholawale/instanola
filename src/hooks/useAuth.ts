import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { SecurityService } from '../services/securityService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only clear impersonation sessions, don't be too aggressive
    const cleanupOrphanedSessions = () => {
      const impersonatedSession = localStorage.getItem('impersonated_user_session');
      const adminSession = localStorage.getItem('admin_impersonation_session');
      
      // If either exists without the other, clear both (but be less aggressive)
      if (impersonatedSession && !adminSession) {
        console.warn('Detected orphaned impersonation session - clearing');
        localStorage.removeItem('impersonated_user_session');
      }
    };
    
    cleanupOrphanedSessions();
    
    let userDocUnsubscribe: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setError(null); // Clear any previous errors
      
      if (firebaseUser) {
        try {
          // Firebase user is authenticated, continue with setup
          
          // Check for impersonation session ONLY after Firebase auth is verified
          const impersonatedSession = localStorage.getItem('impersonated_user_session');
          const adminSession = localStorage.getItem('admin_impersonation_session');
          
          if (impersonatedSession && adminSession) {
            try {
              const sessionData = JSON.parse(adminSession);
              // CRITICAL: Verify the current Firebase user is the admin who started impersonation
              if (sessionData.adminUserId === firebaseUser.uid) {
                const userData = JSON.parse(impersonatedSession);
                setUser(userData);
                setLoading(false);
                console.log('Loaded verified impersonated user session:', userData.email);
                return;
              } else {
                console.warn('Impersonation session security violation - clearing invalid session');
                localStorage.removeItem('impersonated_user_session');
                localStorage.removeItem('admin_impersonation_session');
              }
            } catch (error) {
              console.error('Error validating impersonated session:', error);
              localStorage.removeItem('impersonated_user_session');
              localStorage.removeItem('admin_impersonation_session');
            }
          }
          
          // Store session info (less aggressive than before)
          localStorage.setItem('session_start', Date.now().toString());
          
          // Set up real-time listener for the Firebase authenticated user
          userDocUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
            // Get user data from Firestore or use defaults
            const fetchedUserData = userDoc.exists() ? userDoc.data() : {};
            
            console.log('User data loaded:', { 
              email: fetchedUserData.email || firebaseUser.email, 
              isAdmin: fetchedUserData.isAdmin,
              isBlocked: fetchedUserData.isBlocked,
              forceLogout: fetchedUserData.forceLogout,
              adminType: typeof fetchedUserData.isAdmin 
            }); // Debug log
            
            // Check if user has been blocked or forced to logout
            if (fetchedUserData.isBlocked === true || fetchedUserData.forceLogout === true) {
              console.log('User has been blocked or forced logout, signing out...');
              localStorage.removeItem('session_start');
              signOut(auth).catch(console.error);
              return;
            }
            
            // Security check: Verify admin status hasn't been tampered with
            const isAdminValue = fetchedUserData.isAdmin;
            if (isAdminValue !== true && isAdminValue !== false && isAdminValue !== undefined) {
              console.warn('Suspicious admin status value detected:', isAdminValue);
              // Force to false if suspicious value
              fetchedUserData.isAdmin = false;
            }
            
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: fetchedUserData.name || '',
              walletBalance: fetchedUserData.walletBalance || 0,
              walletBalanceNGN: fetchedUserData.walletBalanceNGN || 0,
              isAdmin: fetchedUserData.isAdmin === true, // Explicit boolean check
              createdAt: fetchedUserData.createdAt?.toDate() || new Date()
            };
            
            // CRITICAL FIX: Clear suspicious activity flags for admin users
            if (userData.isAdmin === true) {
              console.log('Admin user detected - clearing any suspicious activity flags');
              SecurityService.clearSuspiciousActivityFlag();
              
              // Clear any existing session blocks for admin users
              localStorage.removeItem('suspicious_activity');
              localStorage.removeItem('session_blocked');
            }
            
            // IMPORTANT: Set both user data AND loading state together to prevent flash
            setUser(userData);
            setLoading(false);
            
            // Skip aggressive auth validation that was causing auto-logouts
          }, (error) => {
            console.error('Error listening to user document:', error);
            setError('Failed to load user data. Please refresh the page.');
            setLoading(false);
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError('Failed to load user data. Please refresh the page.');
          setLoading(false);
        }
      } else {
        // Clean up user document listener when user logs out
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
          userDocUnsubscribe = null;
        }
        
        // Simple session cleanup
        localStorage.removeItem('session_start');
        
        // Clear any impersonation session on logout
        localStorage.removeItem('impersonated_user_session');
        localStorage.removeItem('admin_impersonation_session');
        
        // IMPORTANT: Set both user and loading state together for clean logout
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []);

  // Check if currently impersonating
  const isImpersonating = () => {
    return localStorage.getItem('admin_impersonation_session') !== null;
  };
  
  // Get admin session data
  const getAdminSession = () => {
    const session = localStorage.getItem('admin_impersonation_session');
    return session ? JSON.parse(session) : null;
  };

  // Start impersonation function
  const startImpersonation = async (targetUserId: string, targetUserData: any) => {
    try {
      console.log('Starting impersonation in useAuth hook');
      
      // Store admin session before switching
      const adminSessionData = {
        adminUserId: user?.id,
        adminEmail: user?.email,
        adminName: user?.name,
        impersonationStartedAt: new Date().toISOString(),
        targetUserId: targetUserId,
        targetEmail: targetUserData.email,
        targetName: targetUserData.name
      };
      
      localStorage.setItem('admin_impersonation_session', JSON.stringify(adminSessionData));
      localStorage.setItem('impersonated_user_session', JSON.stringify(targetUserData));
      
      // Set the impersonated user
      setUser(targetUserData);
      
      console.log('Impersonation started successfully');
      return true;
    } catch (error) {
      console.error('Error in startImpersonation:', error);
      return false;
    }
  };

  // Stop impersonation function
  const stopImpersonation = async () => {
    try {
      console.log('Stopping impersonation in useAuth hook');
      
      const adminSession = localStorage.getItem('admin_impersonation_session');
      if (!adminSession) {
        console.warn('No admin session found to restore');
        return false;
      }
      
      const sessionData = JSON.parse(adminSession);
      
      // Clear impersonation data
      localStorage.removeItem('admin_impersonation_session');
      localStorage.removeItem('impersonated_user_session');
      
      // Clear security flags that might prevent admin re-login
      SecurityService.clearImpersonationSecurityFlags(sessionData.targetUserId);
      
      // Force reload to restore admin session properly
      window.location.reload();
      
      return true;
    } catch (error) {
      console.error('Error in stopImpersonation:', error);
      return false;
    }
  };

  return { 
    user, 
    loading, 
    error,
    isImpersonating: isImpersonating(),
    adminSession: getAdminSession(),
    startImpersonation,
    stopImpersonation,
    realUser: getAdminSession(), 
    impersonatedUser: isImpersonating() ? user : null
  };
}