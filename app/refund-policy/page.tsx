import Link from 'next/link'

export const metadata = {
  title: 'Refund Policy | TruOTP',
  description: 'Refund Policy for purchases/subscriptions made through www.truotp.com.',
}

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">REFUND POLICY</h1>
        <p className="text-white/70 mb-10">Last updated: September 22, 2025</p>

        <p className="text-white/80 leading-relaxed mb-8">
          These Refund Terms apply to all purchases/subscriptions you make through
          <span className="font-semibold"> www.truotp.com</span> (if applicable).
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. General</h2>
            <p className="text-white/80 leading-relaxed">
              All refunds are subject to this Refund Policy. If you believe you are eligible for a refund,
              you must make a request in writing (email to
              <a href="mailto:info@truotp.com" className="text-blue-300 hover:text-blue-200 underline"> info@truotp.com</a>)
              within the timeframe specified below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Eligibility</h2>
            <p className="text-white/80 leading-relaxed">Refunds will be considered only if:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>The service or product is faulty or not as described, or</li>
              <li>We fail to deliver the service within the promised timeframe, or</li>
              <li>Other legitimate reason as per our discretion and these terms.</li>
            </ul>
            <p className="text-white/80 leading-relaxed mt-3">
              Services that have been substantially used may not be eligible for full refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Timeframe</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Refund request must be made within <span className="font-medium">7 days</span> of purchase.</li>
              <li>We will process refund requests within <span className="font-medium">14 days</span> after verification.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Process</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Send refund request to <a href="mailto:info@truotp.com" className="text-blue-300 hover:text-blue-200 underline">info@truotp.com</a> with your order / subscription details, and reason for refund.</li>
              <li>We may ask for additional information to verify your claim.</li>
              <li>Once approved, refund will be made through the original payment method.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Non‑Refundable / Exclusions</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Services already rendered or used (e.g. OTPs already delivered) cannot be refunded if issue is not due to our fault.</li>
              <li>Any subscription, recurring service, or usage‑based service which by its nature is non-refundable, unless otherwise stated.</li>
              <li>Transaction fees, payment gateway fees, etc. may not be refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Modification or Cancellation by Us</h2>
            <p className="text-white/80 leading-relaxed">
              We reserve the right to refuse refund requests that do not meet these criteria. We may cancel or suspend
              services in certain circumstances (e.g. breach of Terms), in which case we will consider prorated refunds
              as per our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Contact & Support</h2>
            <address className="not-italic text-white/80 leading-relaxed">
              Email: <a href="mailto:info@truotp.com" className="text-blue-300 hover:text-blue-200 underline">info@truotp.com</a>
              <br />
              Address: Mindmill Corporate Tower, 2nd Floor, 24A Film City, Noida, UP 201301, India
            </address>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-blue-300 hover:text-blue-200 underline">Return to Home</Link>
        </div>
      </section>
    </main>
  )
}
