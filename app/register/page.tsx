"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowLeft,Sparkles } from "lucide-react"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState<'form' | 'qr'>('form')
  // QR verification state
  type QRLoginData = { qrCode: string; hash: string; expiresAt: string; whatsappUrl?: string; smsUrl?: string; smsUrlSmsto?: string; companyNumber?: string; instructions: string }
  const [qrData, setQrData] = useState<QRLoginData | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (step === 'form') {
      // Validate passwords match and strength
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      // Switch to QR flow: generate WhatsApp QR for the provided phone
      setLoading(true)
      try {
        const resp = await fetch(`${API_BASE_URL}/auth/request-whatsapp-qr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone })
        })
        const data = await resp.json()
        if (data.success && data.data) {
          setQrData(data.data)
          // countdown setup
          if (data.data.expiresAt) {
            const expireMs = Math.max(0, new Date(data.data.expiresAt).getTime() - Date.now())
            setRemainingSeconds(Math.floor(expireMs / 1000))
          }
          setStep('qr')
          setSuccess('QR generated! Open WhatsApp and send the pre-filled message to verify your number.')
          // start polling for verification
          await startStatusChecking(data.data.hash)
        } else {
          setError(data.message || 'Failed to generate QR')
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    } else {
      // In QR step, submission not used
      return
    }
  }

  async function startStatusChecking(hash: string) {
    if (!hash || checkingStatus) return
    setCheckingStatus(true)
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/auth/verify-qr-status/${hash}?t=${Date.now()}`)
        const j = await r.json()
        if (j.success) {
          if (j.data.status === 'verified' && j.data.user && j.data.token) {
            // stop polling
            try { if (statusCheckInterval.current) clearInterval(statusCheckInterval.current as any) } catch {}
            setCheckingStatus(false)
            // persist token
            try { localStorage.setItem('authToken', j.data.token) } catch {}
            // finalize registration: set name/email/password and greet
            const resp = await fetch(`${API_BASE_URL}/auth/complete-registration`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${j.data.token}` },
              body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password })
            })
            const done = await resp.json()
            if (done.success) {
              setSuccess('Registration complete! Redirecting to dashboard...')
              setTimeout(() => { window.location.href = '/after-login-page' }, 1000)
            } else {
              setError(done.message || 'Failed to complete registration')
            }
          } else if (j.data.status === 'expired') {
            setError('QR code expired. Please generate a new one.')
            setQrData(null)
            setCheckingStatus(false)
          }
        } else {
          setError(j.message || 'Failed to verify QR code')
          setCheckingStatus(false)
        }
      } catch {
        setError('Failed to check verification status. Please try again.')
        setCheckingStatus(false)
      }
    }
    try { await check() } catch {}
    try { statusCheckInterval.current = setInterval(check, 2000) as any } catch {}
  }

  // Live countdown for QR expiry
  useEffect(() => {
    if (!qrData?.expiresAt) {
      setRemainingSeconds(null)
      return
    }
    const compute = () => {
      const seconds = Math.max(0, Math.floor((new Date(qrData.expiresAt).getTime() - Date.now()) / 1000))
      setRemainingSeconds(seconds)
      if (seconds <= 0) {
        setError('QR code expired. Please generate a new one.')
        setCheckingStatus(false)
        setQrData(null)
        try { if (statusCheckInterval.current) clearInterval(statusCheckInterval.current as any) } catch {}
      }
    }
    compute()
    const id = setInterval(compute, 1000)
    return () => clearInterval(id)
  }, [qrData?.expiresAt])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      try { if (statusCheckInterval.current) clearInterval(statusCheckInterval.current as any) } catch {}
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        {/* <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors backdrop-blur-sm bg-white/10 px-4 py-2 rounded-full border border-white/20"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Home
          </Link>
        </div> */}

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Join Us Today</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Create Your
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Account</span>
          </h1>
          <p className="text-white/80 text-lg">Join us with a secure account</p>
        </div>

        <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">Sign Up</CardTitle>
            <CardDescription className="text-white/80 text-base">
              Enter your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-white/90 font-medium mb-2 block">Full Name</Label>
                <div className="relative">
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading || step === 'qr'}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  />
                  <User size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-white/90 font-medium mb-2 block">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading || step === 'qr'}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  />
                  <Mail size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-white/90 font-medium mb-2 block">Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading || step === 'qr'}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  />
                  <Phone size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password" className="text-white/90 font-medium mb-2 block">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading || step === 'qr'}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-white/60 mt-2">Must be at least 6 characters</p>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white/90 font-medium mb-2 block">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading || step === 'qr'}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {step === 'qr' && qrData && (
                <div className="space-y-4">
                  <div className="text-center">
                    <img src={qrData.qrCode} alt="QR Code" className="mx-auto border border-white/20 rounded-lg" style={{ maxWidth: '200px' }} />
                  </div>
                  <div className="text-sm text-white/80">
                    <p className="font-medium">Verify your phone via WhatsApp</p>
                    <p>{qrData.instructions}</p>
                  </div>
                  <div className="space-y-2">
                    {qrData.whatsappUrl && (
                      <a href={qrData.whatsappUrl} target="_blank" rel="noopener noreferrer" className="block w-full bg-green-500 text-white text-center py-2 px-4 rounded-lg text-sm hover:bg-green-600 transition-colors">📱 Open WhatsApp</a>
                    )}
                    {qrData.smsUrl && (
                      <a href={qrData.smsUrl} className="block w-full bg-blue-500 text-white text-center py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors">💬 Open SMS</a>
                    )}
                    {qrData.smsUrlSmsto && (
                      <a href={qrData.smsUrlSmsto} className="block w-full bg-blue-500/90 text-white text-center py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors">💬 Open SMS (SMSTO)</a>
                    )}
                  </div>
                  <div className="text-xs text-white/70 space-y-1">
                    <p>Company Number: {qrData.companyNumber || '9756862551'}</p>
                    <p>
                      Expires: {new Date(qrData.expiresAt).toLocaleTimeString()} {typeof remainingSeconds === 'number' && `(in ${Math.max(0, remainingSeconds)}s)`}
                    </p>
                  </div>
                  {checkingStatus && (
                    <div className="text-center text-sm text-blue-300">⏳ Waiting for verification...</div>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={
                  (step === 'form' && (loading || !formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword))
                }
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
              >
                {step === 'form' ? (loading ? 'Generating QR...' : 'Verify via WhatsApp QR') : 'Waiting for verification...'}
              </Button>

              {error && (
                <div className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 p-4 rounded-xl backdrop-blur-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-300 bg-green-500/20 border border-green-500/30 p-4 rounded-xl backdrop-blur-sm">
                  {success}
                </div>
              )}

              <div className="text-center text-sm text-white/80">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-300 hover:text-blue-200 font-medium transition-colors">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
