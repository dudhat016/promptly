import { useMemo } from 'react';
import { useConfig } from '../../hooks/useConfig';

interface Breadcrumb {
  name: string;
  item: string;
}

interface SchemaProps {
  type: 'Prompt' | 'Blog' | 'General' | 'Pricing';
  data: any;
  breadcrumbs?: Breadcrumb[];
}

export default function Schema({ type, data, breadcrumbs }: SchemaProps) {
  const { config } = useConfig();
  
  const schemaData = useMemo(() => {
    const baseUrl = window.location.origin;
    const schemas: any[] = [];
    const siteName = config.siteName || "Promptly";

    // 1. Breadcrumb Schema (Always useful)
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.item.startsWith('http') ? b.item : `${baseUrl}${b.item}`
        }))
      });
    }

    // 2. Main Entity Schema
    if (type === 'Prompt' && data) {
      // SoftwareApplication Schema
      schemas.push({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": data.title,
        "description": data.description,
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": config.currency || "USD",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": data.likesCount || 12
        }
      });

      // HowTo Schema (if usage guide exists)
      if (data.usageGuide) {
        const steps = data.usageGuide.split('\n').filter((s: string) => s.trim().length > 0);
        if (steps.length > 0) {
          schemas.push({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": `How to use: ${data.title}`,
            "description": data.description,
            "step": steps.map((s: string, i: number) => ({
              "@type": "HowToStep",
              "position": i + 1,
              "text": s
            }))
          });
        }
      }
    }

    if (type === 'Pricing' && data?.plans?.length) {
      // ItemList of Offers for the pricing page
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `${siteName} Pricing Plans`,
        "itemListElement": data.plans.map((plan: any, i: number) => ({
          "@type": "ListItem",
          "position": i + 1,
          "item": {
            "@type": "Offer",
            "name": plan.name,
            "description": plan.description || plan.tagline || plan.name,
            "price": plan.monthlyPrice ?? 0,
            "priceCurrency": data.currency || config.currency || "USD",
            "availability": "https://schema.org/InStock",
            "url": `${baseUrl}/pricing`,
          }
        }))
      });

      // WebPage with Organization
      schemas.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": `Pricing — ${siteName}`,
        "description": `Choose a ${siteName} plan that fits your needs. Free and Pro options available.`,
        "url": `${baseUrl}/pricing`,
        "provider": {
          "@type": "Organization",
          "name": siteName,
          "url": baseUrl,
        }
      });
    }

    if (type === 'Blog' && data) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": data.title,
        "description": data.excerpt || data.metaDescription,
        "image": data.coverImage || config.ogImage || `${baseUrl}/og-image.png`,
        "datePublished": data.publishedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": data.authorName || `${siteName} Team`
        },
        "publisher": {
          "@type": "Organization",
          "name": siteName,
          "logo": {
            "@type": "ImageObject",
            "url": config.logoLight || config.logoDark || `${baseUrl}/logo.png`
          }
        }
      });
    }

    return schemas;
  }, [type, data, breadcrumbs, config.siteName, config.currency, config.logoLight, config.logoDark, config.ogImage]);

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
