import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Users, Award, Globe, CheckCircle, Target, Sparkles } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Navigation is handled by the shared Navbar in app/layout.tsx */}
      
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 pointer-events-none -z-10"></div>
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Hero Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span>About Us</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            About
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> TruOTP</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-4xl mx-auto leading-relaxed">
            Leading the future of secure communication with innovative OTP verification and phone number intelligence
            solutions trusted by businesses worldwide.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-6">
                At TruOTP, we're dedicated to making digital communication more secure and trustworthy. Our mission
                is to provide businesses and developers with the most reliable, efficient, and secure OTP verification
                services available.
              </p>
              <p className="text-lg text-gray-600">
                We believe that security shouldn't come at the cost of user experience. That's why we've built our
                platform to be both incredibly secure and remarkably easy to integrate and use.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Security First</h3>
                  <p className="text-sm text-gray-600">Every solution built with security as the foundation</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">User Focused</h3>
                  <p className="text-sm text-gray-600">Designed for developers, built for end users</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-lg text-gray-600">
              Founded in 2020 by a team of security experts and software engineers
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">The Problem</h3>
                    <p className="text-gray-600">
                      We noticed that existing OTP verification solutions were either too complex to implement, too
                      expensive for small businesses, or lacked the security features that modern applications require.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">The Solution</h3>
                    <p className="text-gray-600">
                      We set out to build a platform that would be secure by design, easy to integrate, and affordable
                      for businesses of all sizes. Our team combined decades of experience in cybersecurity,
                      telecommunications, and software development.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">The Impact</h3>
                    <p className="text-gray-600">
                      Today, TruOTP serves over 500 businesses worldwide, processing millions of OTP verifications
                      monthly. We've helped companies reduce fraud, improve user experience, and build more secure
                      applications.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-lg text-gray-600">The principles that guide everything we do</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Security & Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We prioritize the security and privacy of our users' data above all else. Every feature is built with
                  security-first principles and undergoes rigorous testing.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Reliability</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Our platform maintains 99.9% uptime with redundant systems and 24/7 monitoring. When you need
                  verification services, we're always there.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Customer Success</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your success is our success. We provide comprehensive support, detailed documentation, and work
                  closely with our clients to ensure they achieve their goals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Global Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Our services work worldwide with support for international phone numbers and compliance with global
                  privacy regulations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We continuously invest in research and development to stay ahead of emerging threats and provide
                  cutting-edge verification solutions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We believe in clear communication, transparent pricing, and honest business practices. No hidden fees,
                  no surprises.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-lg text-gray-600">Experienced professionals dedicated to your security</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">JS</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">John Smith</h3>
                <p className="text-blue-600 mb-3">CEO & Co-Founder</p>
                <p className="text-sm text-gray-600">
                  Former security architect with 15+ years in cybersecurity and telecommunications.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">SJ</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Sarah Johnson</h3>
                <p className="text-blue-600 mb-3">CTO & Co-Founder</p>
                <p className="text-sm text-gray-600">
                  Software engineering leader with expertise in distributed systems and API design.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">MB</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Michael Brown</h3>
                <p className="text-blue-600 mb-3">VP of Engineering</p>
                <p className="text-sm text-gray-600">
                  Platform engineering expert focused on scalability, reliability, and performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Secure Your Applications?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of companies that trust TruOTP for their verification needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-white/90 rounded-full shadow-md hover:shadow-lg px-8 py-3 cursor-pointer">
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-transparent text-white border border-white hover:bg-white/10 rounded-full shadow-md hover:shadow-lg px-8 py-3 cursor-pointer"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
