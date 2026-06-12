import { MetadataRoute } from 'next';

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
