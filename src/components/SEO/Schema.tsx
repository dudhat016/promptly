import { useMemo } from 'react';

interface Breadcrumb {
  name: string;
  item: string;
}

interface SchemaProps {
  type: 'Prompt' | 'Blog' | 'General';
  data: any;
  breadcrumbs?: Breadcrumb[];
}

export default function Schema({ type, data, breadcrumbs }: SchemaProps) {
  const schemaData = useMemo(() => {
    const baseUrl = window.location.origin;
    const schemas: any[] = [];

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
          "price": data.isPaid ? "Subscription" : "0",
          "priceCurrency": "USD",
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

    if (type === 'Blog' && data) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": data.title,
        "description": data.excerpt || data.metaDescription,
        "image": data.coverImage || `${baseUrl}/og-image.png`,
        "datePublished": data.publishedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": data.authorName || "Promptly Team"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Promptly",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/logo.png`
          }
        }
      });
    }

    return schemas;
  }, [type, data, breadcrumbs]);

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
