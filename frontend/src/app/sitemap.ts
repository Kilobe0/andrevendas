import { MetadataRoute } from 'next';

// Exigido pelo output: 'export' (GitHub Pages)
export const dynamic = 'force-static';

const BASE_URL = 'https://andrevalenca.com.br';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/catalogo`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/artista`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contato`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/artworks`);
    const artworks = await res.json();
    const artworkRoutes: MetadataRoute.Sitemap = artworks.map((a: any) => ({
      url: `${BASE_URL}/obra/${a.slug}`,
      lastModified: new Date(a.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...artworkRoutes];
  } catch {
    return staticRoutes;
  }
}
