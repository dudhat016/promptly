import LegalLayout from '../components/LegalLayout';
import { useConfig } from '../hooks/useConfig';
import { useSiteContent } from '../hooks/useSiteContent';
import { Loader2 } from 'lucide-react';

export default function PrivacyPage() {
  const { config } = useConfig();
  const { content, loading } = useSiteContent('privacy');
  const siteName = config.siteName || "Promptly";

  if (loading) {
    return (
      <LegalLayout title="Privacy Policy" lastUpdated="...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      </LegalLayout>
    );
  }

  if (content?.content) {
    return (
      <LegalLayout title="Privacy Policy" lastUpdated={content.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently Updated'}>
        <div 
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: content.content }} 
        />
      </LegalLayout>
    );
  }

  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 2026">
      <section>
        <h2>1. Information Collection</h2>
        <p>
          We collect information you provide directly to us at {siteName}, such as when you create or modify your account, request support, or otherwise communicate with us. This includes your name, email address, and profile picture.
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
          We use reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction at {siteName}.
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
          You may update or correct your account information at any time by logging into your account settings. You may also request to delete your account by contacting us through our support channels.
        </p>
      </section>
    </LegalLayout>
  );
}
