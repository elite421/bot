'use client';

import React, { useState } from 'react';

const ForgetPasswordPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [type, setType] = useState<'email' | 'phone'>('email');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'init' | 'verify'>('init');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (step === 'init') {
      setLoading(true);
      try {
        const payload: any = {};
        if (type === 'email') payload.email = input;
        else payload.phone = input;

        const res = await fetch(`${API_BASE_URL}/auth/password-reset-initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setMessage('OTP sent to your WhatsApp. Enter the code and new password below.');
          setStep('verify');
        } else {
          setError(data.message || 'Failed to send OTP');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Verify OTP and reset password
      if (!otp || !newPassword || newPassword.length < 6) {
        setError('Enter valid OTP and a new password (min 6 chars).');
        return;
      }
      setLoading(true);
      try {
        const payload: any = { code: otp, newPassword };
        if (type === 'email') payload.email = input;
        else payload.phone = input;

        const res = await fetch(`${API_BASE_URL}/auth/password-reset-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setMessage('Password updated. Redirecting to dashboard...');
          try { localStorage.setItem('authToken', data.data.token); } catch {}
          window.location.href = '/after-login-page';
        } else {
          setError(data.message || 'Invalid OTP');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 rounded-xl shadow-2xl border border-gray-200">
      <h2 className="text-3xl font-extrabold mb-8 text-center text-white tracking-tight">Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <div className="flex justify-center gap-8 mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              checked={type === 'email'}
              onChange={() => setType('email')}
              disabled={step === 'verify'}
              className="accent-blue-600"
            />
            <span className="ml-3 text-white font-medium">Email</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              checked={type === 'phone'}
              onChange={() => setType('phone')}
              disabled={step === 'verify'}
              className="accent-blue-600"
            />
            <span className="ml-3 text-white font-medium">Phone Number</span>
          </label>
        </div>
        <div className="mb-6">
          <input
            type={type === 'email' ? 'email' : 'tel'}
            placeholder={type === 'email' ? 'Enter your email' : 'Enter your phone number'}
            value={input}
            onChange={e => setInput(e.target.value)}
            required
            disabled={step === 'verify'}
            className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg transition text-white bg-transparent placeholder-white"
          />
        </div>

        {step === 'verify' && (
          <>
            <div className="mb-6">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                required
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg transition text-white bg-transparent placeholder-white"
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg transition text-white bg-transparent placeholder-white"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-lg shadow"
        >
          {step === 'init' ? (loading ? 'Sending OTP...' : 'Send OTP') : (loading ? 'Verifying...' : 'Verify & Reset Password')}
        </button>
      </form>

      {message && (
        <p className="mt-6 text-center text-base text-green-200 font-medium">{message}</p>
      )}
      {error && (
        <p className="mt-6 text-center text-base text-red-300 font-medium">{error}</p>
      )}
    </div>
  );
};

export default ForgetPasswordPage;