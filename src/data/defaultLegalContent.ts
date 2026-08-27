export interface LegalDefault {
  title: string;
  content: string;
}

export const DEFAULT_LEGAL_PAGES: Record<string, LegalDefault> = {
  privacy: {
    title: 'Privacy Policy',
    content: `
      <h2>1. Information Collection</h2>
      <p>We collect information you provide directly to us at Promptly, such as when you create or modify your account, request support, or otherwise communicate with us. This includes your name, email address, and profile picture.</p>
      
      <h2>2. Use of Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our Services;</li>
        <li>Process transactions and send related information;</li>
        <li>Send you technical notices, updates, and support messages;</li>
        <li>Respond to your comments and questions.</li>
      </ul>
      
      <h2>3. Data Security</h2>
      <p>We use reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction at Promptly.</p>
      
      <h2>4. Third-Party Services</h2>
      <p>We use third-party services such as Firebase (Google) for authentication and database management, and Stripe for payment processing. These services have their own privacy policies.</p>
      
      <h2>5. Your Choices</h2>
      <p>You may update or correct your account information at any time by logging into your account settings. You may also request to delete your account by contacting us through our support channels.</p>
    `,
  },
  terms: {
    title: 'Terms of Service',
    content: `
      <h2>1. Agreement to Terms</h2>
      <p>By accessing or using Promptly, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
      
      <h2>2. Intellectual Property</h2>
      <p>The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Promptly and its licensors.</p>
      
      <h2>3. User Accounts</h2>
      <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
      
      <h2>4. Marketplace Guidelines</h2>
      <p>Promptly provides a platform for users to share and discover AI prompts. While we strive for quality, we do not guarantee the output of any prompt. Users are responsible for testing prompts and ensuring they comply with the terms of service of the respective AI models (e.g., OpenAI, Anthropic, Google).</p>
      
      <h2>5. Termination</h2>
      <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
      
      <h2>6. Limitation of Liability</h2>
      <p>In no event shall Promptly, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
    `,
  },
  dmca: {
    title: 'DMCA Policy',
    content: `
      <h2>Copyright Infringement Notification</h2>
      <p>Promptly respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement.</p>
      
      <h2>Submitting a DMCA Notice</h2>
      <p>If you are a copyright owner or an agent thereof and believe that any Content on our platform infringes upon your copyrights, you may submit a notification pursuant to the DMCA by providing our Copyright Agent with the following information in writing:</p>
      <ul>
        <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed;</li>
        <li>Identification of the copyrighted work claimed to have been infringed;</li>
        <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate the material;</li>
        <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address;</li>
        <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law;</li>
        <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner.</li>
      </ul>
      
      <h2>Contact Information</h2>
      <p>Please send DMCA notices to our designated agent at:<br /><strong>Email:</strong> copyright@promptly.com</p>
    `,
  },
  cookies: {
    title: 'Cookie Policy',
    content: `
      <h2>What Are Cookies</h2>
      <p>Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.</p>
      
      <h2>How Promptly Uses Cookies</h2>
      <p>When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes:</p>
      <ul>
        <li><strong>Essential Cookies:</strong> To authenticate users and prevent fraudulent use of user accounts.</li>
        <li><strong>Analytics Cookies:</strong> To track information how the Service is used so that we can make improvements.</li>
        <li><strong>Preference Cookies:</strong> To remember information that changes the way the Service behaves or looks, such as your language preference.</li>
      </ul>
      
      <h2>Third-Party Cookies</h2>
      <p>In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and so on. This includes Google Analytics and Stripe.</p>
      
      <h2>Your Choices Regarding Cookies</h2>
      <p>If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer.</p>
    `,
  },
};
