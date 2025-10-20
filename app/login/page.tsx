"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, QrCode, Smartphone, ArrowLeft, Sparkles } from "lucide-react"
import QRLogin from '@/components/QRLogin';


export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'qr' | 'traditional'>('qr')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Login successful!');
        // Store token in localStorage
        localStorage.setItem('authToken', data.data.token);
        // Send login alert (best-effort)
        try {
          await fetch('/api/track-login', {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.data.token}` },
            credentials: 'same-origin',
          });
        } catch {}
        // Redirect to dashboard
        window.location.href = '/after-login-page';
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
            <span>Welcome Back</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Sign In to Your
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Account</span>
          </h1>
          <p className="text-white/80 text-lg">Choose your preferred login method</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-8 border border-white/20">
          <button
            onClick={() => setLoginMethod('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${
              loginMethod === 'qr'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <QrCode size={18} />
            <span className="font-medium">QR Login</span>
          </button>
          <button
            onClick={() => setLoginMethod('traditional')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${
              loginMethod === 'traditional'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Smartphone size={18} />
            <span className="font-medium">Password Login</span>
          </button>
        </div>

        {loginMethod === 'qr' ? (
          (<QRLogin />)
        ) : (
          <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-white mb-2">Password Login</CardTitle>
              <CardDescription className="text-white/80 text-base">
                Enter your phone number or email and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="identifier" className="text-white/90 font-medium mb-2 block">Phone Number or Email</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="+1234567890 or user@example.com"
                    value={formData.identifier}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-white/90 font-medium mb-2 block">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
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
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !formData.identifier || !formData.password}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
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
                  Don't have an account?{' '}
                  <Link href="/register" className="text-blue-300 hover:text-blue-200 font-medium transition-colors">
                    Sign up
                  </Link>
                </div>
                <div className="text-center text-sm text-white/80">
                Forgot Password?{' '}
                <Link href="/forget" className="text-blue-300 hover:text-blue-200 font-medium transition-colors">
                  Click Here
                </Link>
              </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
