import LegalLayout from '@/components/LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-muted-foreground mb-6">
        Last updated: April 10, 2026
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
        <p>
          Welcome to Lounge Learning ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our IELTS preparation platform.
        </p>
        <p>
          By using our service, you agree to the collection and use of information in accordance with this policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul className="list-disc list-inside mt-4 space-y-2">
          <li><strong>Personal Information:</strong> Email addresses, full names, and target IELTS scores provided during registration and profile setup.</li>
          <li><strong>Test Data:</strong> For Speaking tests, we record audio submissions. For Writing tests, we collect text responses you provide.</li>
          <li><strong>Usage Data:</strong> Information about how you interact with our platform, including test attempts, progress tracking, and feature usage.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul className="list-disc list-inside mt-4 space-y-2">
          <li>To provide and maintain our IELTS preparation services</li>
          <li>To evaluate your test submissions using AI-powered analysis</li>
          <li>To track your progress and provide personalized feedback</li>
          <li>To communicate with you about your account and our services</li>
          <li>To improve our platform and develop new features</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Information Sharing and Disclosure</h2>
        <p>
          We do not sell, trade, or otherwise transfer your personal information to third parties, except as described in this policy.
        </p>
        <p>
          We use third-party AI services (OpenAI and Groq APIs) to evaluate your test submissions. Your audio recordings and text responses are sent to these providers solely for the purpose of generating scores and feedback. This data is processed temporarily and is not stored or used by these providers for any other purposes.
        </p>
        <p>
          We may disclose your information if required by law or to protect our rights and safety.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Data Retention</h2>
        <p>
          We retain personal information only for as long as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements.
        </p>
        <p>
          If you delete your account, we permanently remove your profile data, test history, scores, classroom activity linked to your account, and related identifiers from our active systems. Some technical backups may persist for a limited period before automatic deletion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Self-Service Account Deletion</h2>
        <p>
          You can delete your account at any time from the account menu by selecting <strong>Delete my account</strong> and confirming the action.
        </p>
        <p>
          This deletion is permanent and cannot be undone. Once completed, your name and associated account data are removed from Lexora records tied to your account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Your Rights</h2>
        <p>You have the following rights regarding your personal information:</p>
        <ul className="list-disc list-inside mt-4 space-y-2">
          <li>Access: Request a copy of the personal information we hold about you</li>
          <li>Correction: Request correction of inaccurate or incomplete information</li>
          <li>Deletion: Permanently delete your account and associated personal information through the in-product deletion flow or by contacting us</li>
          <li>Portability: Request transfer of your data in a structured format</li>
          <li>Objection: Object to processing of your personal information</li>
        </ul>
        <p>To exercise these rights, please contact us using the information provided below.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <p className="mt-4">
          Email: lexoraielts@gmail.com<br />
          Address: Banepa-9, Kavre, Nepal
        </p>
      </section>
    </LegalLayout>
  );
}