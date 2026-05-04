import LegalLayout from '../components/LegalLayout';

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="May 2026">
      <section>
        <h2>What Are Cookies</h2>
        <p>
          Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.
        </p>
      </section>

      <section>
        <h2>How Promptly Uses Cookies</h2>
        <p>
          When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes:
        </p>
        <ul>
          <li><strong>Essential Cookies:</strong> To authenticate users and prevent fraudulent use of user accounts.</li>
          <li><strong>Analytics Cookies:</strong> To track information how the Service is used so that we can make improvements.</li>
          <li><strong>Preference Cookies:</strong> To remember information that changes the way the Service behaves or looks, such as your language preference.</li>
        </ul>
      </section>

      <section>
        <h2>Third-Party Cookies</h2>
        <p>
          In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and so on. This includes Google Analytics and Stripe.
        </p>
      </section>

      <section>
        <h2>Your Choices Regarding Cookies</h2>
        <p>
          If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer.
        </p>
      </section>
    </LegalLayout>
  );
}
