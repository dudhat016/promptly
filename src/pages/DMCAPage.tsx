import LegalLayout from '../components/LegalLayout';
import { useSiteContent } from '../hooks/useSiteContent';
import { Loader2 } from 'lucide-react';

export default function DMCAPage() {
  const { content, loading } = useSiteContent('dmca');

  if (loading) {
    return (
      <LegalLayout title="DMCA Policy" lastUpdated="...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      </LegalLayout>
    );
  }

  if (content?.content) {
    return (
      <LegalLayout title="DMCA Policy" lastUpdated={content.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently Updated'}>
        <div 
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: content.content }} 
        />
      </LegalLayout>
    );
  }

  return (
    <LegalLayout title="DMCA Policy" lastUpdated="May 2026">
      <section>
        <h2>Copyright Infringement Notification</h2>
        <p>
          Promptly respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement.
        </p>
      </section>

      <section>
        <h2>Submitting a DMCA Notice</h2>
        <p>
          If you are a copyright owner or an agent thereof and believe that any Content on our platform infringes upon your copyrights, you may submit a notification pursuant to the DMCA by providing our Copyright Agent with the following information in writing:
        </p>
        <ul>
          <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed;</li>
          <li>Identification of the copyrighted work claimed to have been infringed;</li>
          <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate the material;</li>
          <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address;</li>
          <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law;</li>
          <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner.</li>
        </ul>
      </section>

      <section>
        <h2>Contact Information</h2>
        <p>
          Please send DMCA notices to our designated agent at: <br />
          <strong>Email:</strong> copyright@promptly.com
        </p>
      </section>
    </LegalLayout>
  );
}
