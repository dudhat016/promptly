import LegalLayout from '../components/LegalLayout';
import { useConfig } from '../hooks/useConfig';
import { useSiteContent } from '../hooks/useSiteContent';
import { Loader2 } from 'lucide-react';

export default function TermsPage() {
  const { config } = useConfig();
  const { content, loading } = useSiteContent('terms');
  const siteName = config.siteName || "Promptly";

  if (loading) {
    return (
      <LegalLayout title="Terms & Conditions" lastUpdated="...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      </LegalLayout>
    );
  }

  if (content?.content) {
    return (
      <LegalLayout title="Terms & Conditions" lastUpdated={content.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently Updated'}>
        <div 
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: content.content }} 
        />
      </LegalLayout>
    );
  }

  return (
    <LegalLayout title="Terms & Conditions" lastUpdated="May 2026">
      <section>
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using {siteName}, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
        </p>
      </section>

      <section>
        <h2>2. Intellectual Property</h2>
        <p>
          The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of {siteName} and its licensors.
        </p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <p>
          When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
        </p>
      </section>

      <section>
        <h2>4. Marketplace Guidelines</h2>
        <p>
          {siteName} provides a platform for users to share and discover AI prompts. While we strive for quality, we do not guarantee the output of any prompt. Users are responsible for testing prompts and ensuring they comply with the terms of service of the respective AI models (e.g., OpenAI, Anthropic, Google).
        </p>
      </section>

      <section>
        <h2>5. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
      </section>

      <section>
        <h2>6. Limitation of Liability</h2>
        <p>
          In no event shall {siteName}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
        </p>
      </section>
    </LegalLayout>
  );
}
