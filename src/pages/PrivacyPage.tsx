import LegalLayout from '../components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 2026">
      <section>
        <h2>1. Information Collection</h2>
        <p>
          We collect information you provide directly to us, such as when you create or modify your account, request support, or otherwise communicate with us. This includes your name, email address, and profile picture.
        </p>
      </section>

      <section>
        <h2>2. Use of Information</h2>
        <p>
          We use the information we collect to:
        </p>
        <ul>
          <li>Provide, maintain, and improve our Services;</li>
          <li>Process transactions and send related information;</li>
          <li>Send you technical notices, updates, and support messages;</li>
          <li>Respond to your comments and questions.</li>
        </ul>
      </section>

      <section>
        <h2>3. Data Security</h2>
        <p>
          We use reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
        </p>
      </section>

      <section>
        <h2>4. Third-Party Services</h2>
        <p>
          We use third-party services such as Firebase (Google) for authentication and database management, and Stripe for payment processing. These services have their own privacy policies.
        </p>
      </section>

      <section>
        <h2>5. Your Choices</h2>
        <p>
          You may update or correct your account information at any time by logging into your account settings. You may also request to delete your account by contacting us.
        </p>
      </section>
    </LegalLayout>
  );
}
