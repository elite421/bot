import Link from 'next/link'

export const metadata = {
  title: 'Terms & Conditions | TruOTP',
  description: 'Terms & Conditions governing use of TruOTP website and services.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">TERMS & CONDITIONS</h1>
        <p className="text-white/70 mb-10">Last updated: September 22, 2025</p>

        <p className="text-white/80 leading-relaxed mb-8">
          These Terms & Conditions (“Terms”) govern your use of the website
          <span className="font-semibold"> www.truotp.com</span> (the “Website”) and services offered by
          Eienone Technology Private Limited (“TruOTP”, “we”, “us”, “our”). By accessing or using the Website
          or services, you agree to these Terms. If you do not agree, do not use our site or services.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Definitions</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li><span className="font-medium">User / You / Your</span>: Any person who accesses or uses the Website or services.</li>
              <li><span className="font-medium">Services</span>: Includes but not limited to OTP services, verification, any other features provided via www.truotp.com.</li>
              <li><span className="font-medium">Content</span>: All text, images, data, graphics, software, or other materials on the Website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Eligibility</h2>
            <p className="text-white/80 leading-relaxed">
              You must be legally capable of entering into binding contracts under Indian law. If you are under 18,
              you may use our services only with the consent of a parent or guardian.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Use of Services</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>You agree to use the Services in compliance with all applicable laws.</li>
              <li>You will not misuse the services (e.g. nor use them for illegal, abusive, or fraudulent purposes).</li>
              <li>You are responsible for maintaining the confidentiality of any account credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Content & Intellectual Property</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>All content on the Website is owned or licensed by TruOTP.</li>
              <li>You may not reproduce, distribute, modify, create derivative works, publicly display or exploit any parts of the services except as permitted by us.</li>
              <li>If you submit feedback or suggestions (“Feedback”), you grant TruOTP a perpetual, non‐exclusive, royalty‐free, worldwide license to use it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Fees & Payments (if applicable)</h2>
            <p className="text-white/80 leading-relaxed">
              If there are charges for certain services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Payment methods accepted, when payments are due, any taxes or transaction fees.</li>
              <li>Consequences for non‐payment or late payment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Disclaimers & Limitation of Liability</h2>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>We make reasonable efforts to ensure that services are available and accurate, but do not guarantee error‐free communications or that services will be uninterrupted.</li>
              <li>To the maximum extent permitted by law, TruOTP is not liable for indirect, incidental, special, or consequential damages arising out of or in connection with use of the Website or services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Privacy & Data Protection</h2>
            <p className="text-white/80 leading-relaxed">
              Our Privacy Policy forms part of these Terms. You consent to our collection, use, storage, and processing of
              personal data as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Termination</h2>
            <p className="text-white/80 leading-relaxed">
              We may suspend or terminate your access to the Website or services at our discretion if you breach these Terms.
              On termination, your right to use the services ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Changes to Terms</h2>
            <p className="text-white/80 leading-relaxed">
              We may update these Terms from time to time. When we do, we’ll post the updated version on this page with a
              “Last updated” date. Continued use after changes equals acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Governing Law & Jurisdiction</h2>
            <p className="text-white/80 leading-relaxed">
              These Terms are governed by the laws of India. Any disputes will be subject to the exclusive jurisdiction of courts in
              Noida, Uttar Pradesh (or as per your choice).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Contact Information</h2>
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
