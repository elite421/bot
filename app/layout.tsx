import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navbar from "../components/Navbar"
import ConditionalFooter from "../components/ConditionalFooter"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TruOTP - Professional OTP Verification & Phone Lookup Services",
  description:
    "Secure OTP verification and phone number lookup services for businesses. Fast, reliable, and easy to integrate with comprehensive API documentation.",
  keywords: "OTP verification, phone lookup, SMS verification, two-factor authentication, phone number validation",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen`}>
        <Navbar />
        {children}
        <ConditionalFooter />
      </body>
    </html>
  )
}
