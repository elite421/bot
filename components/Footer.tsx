import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-white/20 bg-white/5 text-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src="/true-otp.svg" alt="TruOTP" className="h-8 w-8" loading="lazy" decoding="async" />
          <span className="text-white font-semibold">TruOTP</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <span>© {year} TruOTP. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
          <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
        </div>
      </div>
    </footer>
  );
}
