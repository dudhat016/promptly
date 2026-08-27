import { useMemo } from 'react';
import { useConfig } from '../../hooks/useConfig';

interface Breadcrumb {
  name: string;
  item: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

interface SchemaProps {
  type: 'Prompt' | 'Blog' | 'General' | 'Pricing' | 'Website';
  data: any;
  breadcrumbs?: Breadcrumb[];
  faq?: FAQItem[];
}

export default function Schema({ type, data, breadcrumbs, faq }: SchemaProps) {
  const { config } = useConfig();

  const schemaData = useMemo(() => {
    const baseUrl = (import.meta.env.VITE_SITE_URL || (config as any)?.siteUrl || window.location.origin).replace(/\/$/, '');
    const schemas: any[] = [];
    const siteName = config.siteName || 'Promptly';

    // 1. Breadcrumb Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.item.startsWith('http') ? b.item : `${baseUrl}${b.item}`,
        })),
      });
    }

    // 2. FAQ Schema (AEO)
    if (faq && faq.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      });
    }

    // 3. WebSite + SearchAction Schema
    if (type === 'Website') {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: baseUrl,
        description: config.siteDescription || `${siteName} — AI Prompt Library`,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/explore?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      });

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteName,
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: config.logoLight || config.logoDark || `${baseUrl}/logo.png`,
        },
      });
    }

    // 4. Prompt Schema (CreativeWork + SoftwareApplication + HowTo)
    if (type === 'Prompt' && data) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: data.title,
        description: data.description,
        author: {
          '@type': 'Person',
          name: data.creatorName || data.authorName || `${siteName} Team`,
        },
        dateCreated: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        keywords: (data.tags || []).join(', '),
        inLanguage: 'en',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        url: `${baseUrl}/prompts/${data.slug || data.id}`,
      });

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: data.title,
        description: data.description,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: config.currency || 'USD',
          availability: 'https://schema.org/InStock',
        },
        ...(data.likesCount > 0
          ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: data.likesCount } }
          : {}),
      });

      if (data.usageGuide) {
        const steps = data.usageGuide.split('\n').filter((s: string) => s.trim().length > 0);
        if (steps.length > 0) {
          schemas.push({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: `How to use: ${data.title}`,
            description: data.description,
            step: steps.map((s: string, i: number) => ({
              '@type': 'HowToStep',
              position: i + 1,
              text: s,
            })),
          });
        }
      }
    }

    // 5. Pricing Schema
    if (type === 'Pricing' && data?.plans?.length) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${siteName} Pricing Plans`,
        itemListElement: data.plans.map((plan: any, i: number) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Offer',
            name: plan.name,
            description: plan.description || plan.tagline || plan.name,
            price: plan.monthlyPrice ?? 0,
            priceCurrency: data.currency || config.currency || 'USD',
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/pricing`,
          },
        })),
      });
    }

    // 6. Blog Schema (Article)
    if (type === 'Blog' && data) {
      const wordCount = data.content
        ? data.content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
        : undefined;

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.excerpt || data.metaDescription,
        image: data.coverImage || config.ogImage || `${baseUrl}/og-image.png`,
        datePublished: data.publishedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        dateModified: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        inLanguage: 'en',
        ...(wordCount ? { wordCount } : {}),
        keywords: (data.tags || []).join(', '),
        author: {
          '@type': 'Person',
          name: data.authorName || `${siteName} Team`,
        },
        publisher: {
          '@type': 'Organization',
          name: siteName,
          logo: {
            '@type': 'ImageObject',
            url: config.logoLight || config.logoDark || `${baseUrl}/logo.png`,
          },
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', 'h2', '.article-summary', '.prompt-formula'],
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${baseUrl}/blog/${data.slug}`,
        },
      });
    }

    return schemas;
  }, [type, data, breadcrumbs, faq, config.siteName, config.currency, config.logoLight, config.logoDark, config.ogImage, config.siteDescription]);

  return (
    <>
      {schemaData.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
