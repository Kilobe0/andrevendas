import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Exigido pelo output: 'export' (site estático no Cloudflare Pages)
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout/', '/carrinho/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
