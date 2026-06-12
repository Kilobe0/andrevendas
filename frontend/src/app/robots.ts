import { MetadataRoute } from 'next';

// Exigido pelo output: 'export' (GitHub Pages)
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout/', '/carrinho/'],
    },
    sitemap: 'https://andrevalenca.com.br/sitemap.xml',
  };
}
