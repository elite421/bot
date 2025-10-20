"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Phone, MapPin, Clock, Sparkles } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string>("")
  const [error, setError] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess("")
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `Failed (${res.status})`)
      }
      setSuccess("Thank you for your message! We'll get back to you soon.")
      setFormData({ email: "", phone: "", message: "" })
    } catch (err: any) {
      setError(err?.message || 'Failed to send your message')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'phone') {
      // Allow only digits and max 10 digits for Indian numbers
      const raw = value.replace(/\D/g, '')
      // If user pasted +91xxxxxxxxxx or any longer sequence, keep the last 10 digits
      const digits = raw.length > 10 ? raw.slice(-10) : raw
      setFormData((prev) => ({ ...prev, phone: digits }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Navigation is handled by the shared Navbar in app/layout.tsx */}
      
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"></div>

      <div className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Get in Touch</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Contact
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Us</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Have questions about our OTP verification services? We're here to help. Reach out to our team and we'll
              get back to you as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-white mb-2">Send us a Message</CardTitle>
                <CardDescription className="text-white/80 text-base">
                  Fill out the form below and we'll respond within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/90 font-medium">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/90 font-medium">Phone Number (India)</Label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 select-none">+91</div>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                    <p className="text-xs text-white/60">Enter 10 digits only. We will prefix +91 automatically.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-white/90 font-medium">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-60">
                    {submitting ? 'Sending…' : 'Send Message'}
                  </Button>

                  {success && (
                    <div className="text-sm text-green-300 bg-green-500/20 border border-green-500/30 p-3 rounded-xl backdrop-blur-sm">{success}</div>
                  )}
                  {error && (
                    <div className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 p-3 rounded-xl backdrop-blur-sm">{error}</div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-white mb-2">Get in Touch</CardTitle>
                  <CardDescription className="text-white/80 text-base">
                    Multiple ways to reach our support team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Email Support</h3>
                      <p className="text-white/80 text-base">info@eienonetech.com</p>
                      <p className="text-sm text-white/60">We typically respond within 2-4 hours</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Phone Support</h3>
                      <p className="text-white/80 text-base">+919212079494</p>
                      <p className="text-sm text-white/60">Monday - Friday, 9 AM - 6 PM EST</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Office Address</h3>
                      <p className="text-white/80 text-base">
                        2nd floor, Mindmill Corporate Tower
                        <br />
                        24A Film City, Noida,UP 201301
                        <br />
                        India
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Business Hours</h3>
                      <p className="text-white/80 text-base">
                        Monday - Friday: 9:00 AM - 6:00 PM EST
                        <br />
                        Saturday: 10:00 AM - 4:00 PM EST
                        <br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-white mb-2">Enterprise Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80 mb-6 text-base">
                    Need dedicated support for your business? Our enterprise team provides:
                  </p>
                  <ul className="space-y-3 text-white/80 mb-6">
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>24/7 priority support</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Dedicated account manager</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Custom integration assistance</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>SLA guarantees</span>
                    </li>
                  </ul>
                  <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300">
                    <a href="mailto:info@eienonetech.com?subject=Enterprise%20Support%20Inquiry">Contact Enterprise Sales</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
