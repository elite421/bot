import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | TruOTP',
  description: 'Privacy Policy describing how TruOTP collects, uses, and protects your personal data.',
}

export const dynamic = 'force-static'
export const revalidate = 86400

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">PRIVACY POLICY</h1>
        <p className="text-white/70 mb-10">Last updated: September 22, 2025</p>

        <p className="text-white/80 leading-relaxed mb-8">
          Eienone Technology Private Limited ("TruOTP", "we", "us", "our") respects your privacy. This policy explains how we
          collect, use, share, and protect your personal data when you use our Website or services.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Legal Basis & Applicable Laws</h2>
            <p className="text-white/80 leading-relaxed">
              We comply with the Digital Personal Data Protection Act, 2023 and other relevant laws in India. Under previous laws
              (e.g. the Information Technology Act, Rules on reasonable security practices & sensitive personal data etc.), similar
              protections were required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <div className="space-y-4 text-white/80 leading-relaxed">
              <p>
                <span className="font-medium">a. Personal Data</span> – information that identifies you or can be used to identify you, such as:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Name, email address, mobile number</li>
                <li>Billing / payment information (if applicable)</li>
                <li>Device identifiers, IP address, location data (where permitted)</li>
              </ul>
              <p>
                <span className="font-medium">b. Sensitive Personal Data or Information (SPDI)</span> – if applicable, might include such things as
                financial information, etc.
              </p>
              <p>
                <span className="font-medium">c. Usage Data and Cookies</span> – information about how you use our services, to improve functionality,
                performance, etc.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Purpose of Collection & Use</h2>
            <p className="text-white/80 leading-relaxed">We use your data for purposes including:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>To provide, maintain, and improve our services</li>
              <li>To verify identity, send OTPs, perform fraud detection</li>
              <li>To communicate with you (updates, support, promotional with your consent)</li>
              <li>For billing and payment processing (if applicable)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Consent</h2>
            <p className="text-white/80 leading-relaxed">
              We collect, process, store personal data only with your consent (explicit where required). You may withdraw consent,
              subject to legal or contractual restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Sharing & Disclosure</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>
                Third‑party service providers (e.g. payment processors, hosting providers) who help us deliver the services, under
                confidentiality.
              </li>
              <li>
                Legal authorities or others, if required by law, for investigation, compliance, or protection of rights.
              </li>
              <li>
                We will not sell your personal data to unaffiliated third parties for their own marketing purposes without your
                permission.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-white/80 leading-relaxed">
              We implement reasonable security measures (physical, technical, administrative) to protect your data. Access is
              restricted on a need‑to‑know basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-white/80 leading-relaxed">
              We retain personal data only as long as necessary to fulfill the purposes for which it was collected and in accordance
              with legal obligations. When no longer needed, data will be securely deleted or anonymised.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. User Rights</h2>
            <p className="text-white/80 leading-relaxed">You have rights such as:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Right to access the personal data we hold about you</li>
              <li>Right to correction or updation of inaccurate or incomplete data</li>
              <li>Right to erasure (delete), as permitted under law</li>
              <li>Right to objection or restriction of processing</li>
              <li>Right to data portability, where applicable</li>
            </ul>
            <p className="text-white/80 leading-relaxed">
              You may exercise these rights by contacting us at <a href="mailto:info@truotp.com" className="text-blue-300 hover:text-blue-200 underline">info@truotp.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Cookies & Tracking</h2>
            <p className="text-white/80 leading-relaxed">
              We use cookies / similar technologies to enhance user experience, for analytics, and for remembering your preferences.
              You can disable cookies via browser settings, but that may affect functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Grievance Officer</h2>
            <p className="text-white/80 leading-relaxed">As required under Indian IT rules:</p>
            <address className="not-italic text-white/80 leading-relaxed">
              Name: [Name of Grievance Officer]
              <br />
              Contact: [Email, Address]
            </address>
            <p className="text-white/80 leading-relaxed">We respond to complaints regarding privacy within 30 days.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Changes to Privacy Policy</h2>
            <p className="text-white/80 leading-relaxed">
              We may update this policy; changes will be posted with a new “Last updated” date. Continued use constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Contact Us</h2>
            <address className="not-italic text-white/80 leading-relaxed">
              Eienone Technology Private Limited
              <br />
              Mindmill Corporate Tower, 2nd Floor, 24A Film City, Noida, UP 201301, India
              <br />
              Email: <a href="mailto:info@truotp.com" className="text-blue-300 hover:text-blue-200 underline">info@truotp.com</a>
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
