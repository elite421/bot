'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { setupBotLogin, isBotLogin } from '../utils/botLogin';

interface QRLoginData {
  qrCode: string;
  hash: string;
  expiresAt: string;
  instructions: string;
  whatsappUrl?: string;
  smsUrl?: string;
  smsUrlSmsto?: string;
  companyNumber?: string;
}

interface VerificationResponse {
  success: boolean;
  data: {
    status: 'pending' | 'verified' | 'expired';
    user?: User;
    token?: string;
  };
  message?: string;
}

interface User {
  id: number;
  phone: string;
  name?: string;
  email?: string;
  authCredit?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
// Backend base (without /api) for direct auth redirects
const AUTH_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export default function QRLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [qrData, setQrData] = useState<QRLoginData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const handleVerifiedUser = useCallback(async (verificationData: { user: User; token: string }) => {
    try {
      if (verificationComplete) return;
      setVerificationComplete(true);

      const { user, token } = verificationData;
      setUser(user);
      
      // Check if this is a bot login
      const botLoginActive = isBotLogin();
      
      if (botLoginActive) {
        setSuccess('Bot verification successful! Preparing your dashboard...');
        
        // Set up bot login with enhanced information
        setupBotLogin({
          name: user.name || 'Bot User',
          email: user.email || '',
          phone: user.phone,
          authCredit: user.authCredit || 0,
          loginMethod: 'bot_qr'
        });
        
        // Add a small delay to show success message
        setTimeout(() => {
          setSuccess('Redirecting to your dashboard...');
        }, 1000);
        
        // Redirect after 2 seconds to allow user to see the success message
        setTimeout(() => {
          router.push('/after-login-page');
        }, 2000);
      } else {
        setSuccess('Verification successful! Logging you in...');
        // Immediate redirect for regular login
        setTimeout(() => {
          router.push('/after-login-page');
        }, 1000);
      }

      // Store authentication data
      localStorage.setItem('authToken', token);
      // Send login alert (best-effort)
      try {
        await fetch('/api/track-login', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'same-origin',
        });
      } catch {}
      // Notify other components (Navbar) about auth change
      try { window.dispatchEvent(new Event('auth-change')); } catch {}
      localStorage.setItem('userPhone', user.phone);
      localStorage.setItem('userName', user.name || '');
      // Clear any persisted QR session
      try {
        sessionStorage.removeItem('qrLoginData');
        sessionStorage.removeItem('qrLoginPhone');
      } catch {}
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to complete login. Please try again.');
      setVerificationComplete(false);
      
      // Clear bot login data on error
      localStorage.removeItem('botLogin');
      localStorage.removeItem('botUserData');
    }
  }, [verificationComplete, router]);

  const stopStatusChecking = useCallback(() => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
    setCheckingStatus(false);
  }, []);

  const startStatusChecking = useCallback(() => {
    if (!qrData?.hash || checkingStatus) return;

    setCheckingStatus(true);
    setError('');

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-qr-status/${qrData.hash}?t=${Date.now()}`);
        const data: VerificationResponse = await response.json();
        // Log to help diagnose auto-login
        try { console.log('[QRLogin] verify-qr-status response:', data); } catch {}

        if (data.success) {
          if (data.data.status === 'verified' && data.data.user && data.data.token) {
            stopStatusChecking();
            await handleVerifiedUser({ user: data.data.user, token: data.data.token });
          } else if (data.data.status === 'expired') {
            setError('QR code expired. Please generate a new one.');
            setQrData(null);
            stopStatusChecking();
          }
        } else {
          console.error('Verification failed:', data.message);
          setError(data.message || 'Failed to verify QR code');
          stopStatusChecking();
        }
      } catch (error) {
        console.error('Status check error:', error);
        setError('Failed to check verification status. Please try again.');
        stopStatusChecking();
      }
    };

    // Trigger an immediate check, then continue polling
    try { void checkStatus(); } catch {}
    statusCheckInterval.current = setInterval(checkStatus, 2000);
  }, [qrData?.hash, checkingStatus, handleVerifiedUser, stopStatusChecking]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      stopStatusChecking();
    };
  }, [stopStatusChecking]);

  // If component remounts (e.g., Fast Refresh) and a QR is active, resume polling automatically
  useEffect(() => {
    if (qrData?.hash && !checkingStatus) {
      startStatusChecking();
    }
  }, [qrData?.hash, checkingStatus, startStatusChecking]);

  // When tab regains focus or visibility changes, trigger (or re-trigger) status checking
  useEffect(() => {
    const onFocusOrVisible = () => {
      if (qrData?.hash) {
        startStatusChecking();
      }
    };
    try {
      window.addEventListener('focus', onFocusOrVisible);
      document.addEventListener('visibilitychange', onFocusOrVisible);
    } catch {}
    return () => {
      try {
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      } catch {}
    };
  }, [qrData?.hash, startStatusChecking]);

  // On mount, restore pending QR session from sessionStorage if available
  useEffect(() => {
    if (qrData) return;
    try {
      const saved = sessionStorage.getItem('qrLoginData');
      const savedPhone = sessionStorage.getItem('qrLoginPhone') || '';
      if (saved) {
        const parsed: QRLoginData = JSON.parse(saved);
        if (parsed?.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setQrData(parsed);
          if (savedPhone) setPhone(savedPhone);
          setSuccess('Restored pending QR login. Checking verification status...');
        } else {
          sessionStorage.removeItem('qrLoginData');
          sessionStorage.removeItem('qrLoginPhone');
        }
      }
    } catch {}
  }, [qrData]);

  const generateQR = useCallback(async () => {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      stopStatusChecking();

      const response = await fetch(`${API_BASE_URL}/auth/request-whatsapp-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setQrData(data.data);
        // Persist QR session so polling can resume after Fast Refresh
        try {
          sessionStorage.setItem('qrLoginData', JSON.stringify(data.data));
          sessionStorage.setItem('qrLoginPhone', phone.replace(/\D/g, ''));
        } catch {}
        if (data.data.expiresAt) {
          const expireMs = Math.max(0, new Date(data.data.expiresAt).getTime() - Date.now());
          setRemainingSeconds(Math.floor(expireMs / 1000));
        }
        setSuccess('WhatsApp QR code generated! Scan it with your phone.');
        startStatusChecking();
      } else {
        throw new Error(data.message || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('QR generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [phone, startStatusChecking, stopStatusChecking]);

  // Strict WhatsApp-only: manual completion flow removed

  const logout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('botLogin');
    localStorage.removeItem('botUserData');
    setUser(null);
    setQrData(null);
    setSuccess('');
    setError('');
  };

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUser(data.data.user);
            // If user is already logged in, redirect to dashboard
            router.push('/after-login-page');
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('botLogin');
            localStorage.removeItem('botUserData');
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('botLogin');
          localStorage.removeItem('botUserData');
        });
    }
  }, [router]);

  // Live countdown for QR expiry
  useEffect(() => {
    if (!qrData?.expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const compute = () => {
      const seconds = Math.max(
        0,
        Math.floor((new Date(qrData.expiresAt).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(seconds);
      if (seconds <= 0) {
        setError('QR code expired. Please generate a new one.');
        setCheckingStatus(false);
        setQrData(null);
        try {
          sessionStorage.removeItem('qrLoginData');
          sessionStorage.removeItem('qrLoginPhone');
        } catch {}
        try { stopStatusChecking(); } catch {}
      }
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [qrData?.expiresAt, stopStatusChecking]);

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold text-white mb-2">Welcome!</CardTitle>
          <CardDescription className="text-white/80 text-base">You are successfully logged in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white/90">Phone Number</Label>
            <p className="text-sm text-white/80">{user.phone}</p>
          </div>
          {user.name && (
            <div>
              <Label className="text-white/90">Name</Label>
              <p className="text-sm text-white/80">{user.name}</p>
            </div>
          )}
          <Button onClick={() => router.push('/after-login-page')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
            Go to Dashboard
          </Button>
          <Button onClick={logout} variant="outline" className="w-full">
            Logout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-white mb-2">QR Code Login</CardTitle>
        <CardDescription className="text-white/80 text-base">
          Enter your phone number to receive a QR code for secure login
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrData ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-white/90">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            <Button
              onClick={generateQR}
              disabled={loading || !phone}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {loading ? 'Generating QR Code...' : 'Get WhatsApp QR Code'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-block">
                <img
                  src={qrData.qrCode}
                  alt="QR Code"
                  className="mx-auto border border-white/20 rounded-lg"
                  style={{ maxWidth: '200px' }}
                />
              </div>
              {typeof remainingSeconds === 'number' && (
                <div
                  className={`mt-2 ${
                    remainingSeconds <= 10 ? 'text-red-300 animate-pulse' : 'text-white/90'
                  } text-sm font-mono`}
                >
                  {`${Math.floor(remainingSeconds / 60)
                    .toString()
                    .padStart(2, '0')}:${(remainingSeconds % 60)
                    .toString()
                    .padStart(2, '0')}`}
                </div>
              )}
            </div>
            <div className="text-sm text-white/80">
              <p className="font-medium">Instructions:</p>
              <p>{qrData.instructions}</p>
            </div>

            {/* WhatsApp/SMS Links */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Quick Links:</p>
              {qrData.whatsappUrl && (
                <a
                  href={qrData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-500 text-white text-center py-2 px-4 rounded-lg text-sm hover:bg-green-600 transition-colors"
                >
                  📱 Open WhatsApp
                </a>
              )}
              {qrData.smsUrl && (
                <a
                  href={qrData.smsUrl}
                  className="block w-full bg-blue-500 text-white text-center py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  💬 Open SMS
                </a>
              )}
              {qrData.smsUrlSmsto && (
                <a
                  href={qrData.smsUrlSmsto}
                  className="block w-full bg-blue-500/90 text-white text-center py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  💬 Open SMS (SMSTO)
                </a>
              )}
            </div>
            <div className="text-xs text-white/70 space-y-2">
              <p>Company Number: {qrData.companyNumber || '9756862551'}</p>
              <p>
                Expires: {new Date(qrData.expiresAt).toLocaleTimeString()}{' '}
                {typeof remainingSeconds === 'number' && `(in ${Math.max(0, remainingSeconds)}s)`}
              </p>
              {/* Strict WhatsApp-only: manual completion disabled */}
            </div>
            {checkingStatus && (
              <div className="text-center text-sm text-blue-300">
                ⏳ Checking for verification...
              </div>
            )}
            <Button
              onClick={() => {
                setQrData(null);
                setCheckingStatus(false);
                try {
                  sessionStorage.removeItem('qrLoginData');
                  sessionStorage.removeItem('qrLoginPhone');
                } catch {}
                try { stopStatusChecking(); } catch {}
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 p-3 rounded-xl backdrop-blur-sm">{error}</div>
        )}

        {success && (
          <div className="text-sm text-green-300 bg-green-500/20 border border-green-500/30 p-3 rounded-xl backdrop-blur-sm">{success}</div>
        )}
      </CardContent>
    </Card>
  );
}