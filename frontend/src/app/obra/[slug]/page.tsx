import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArtworks, getArtworkBySlug, getRelatedArtworks, formatPrice, getImageUrl } from '@/lib/api';
import ArtworkDetail from '@/components/gallery/ArtworkDetail';

// No export estático (GitHub Pages) cada obra vira um HTML gerado no build;
// obras criadas depois só aparecem após um novo deploy.
export async function generateStaticParams() {
  try {
    const artworks = await getArtworks();
    return artworks.map((a) => ({ slug: a.slug }));
  } catch (err) {
    // output: 'export' não aceita lista vazia — sem API não há o que publicar
    if (process.env.STATIC_EXPORT === '1') {
      throw new Error(
        `API indisponível em ${process.env.NEXT_PUBLIC_API_URL} — o build estático precisa do backend no ar. (${err})`,
      );
    }
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const artwork = await getArtworkBySlug(slug);
    return {
      title: `${artwork.title} — André Valença`,
      description: artwork.description,
      openGraph: {
        title: artwork.title,
        description: artwork.description,
        images: [{ url: getImageUrl(artwork.images[0]) }],
        type: 'website',
      },
    };
  } catch {
    return { title: 'Obra não encontrada' };
  }
}

export default async function ObraPage({ params }: Props) {
  const { slug } = await params;

  let artwork;
  try {
    artwork = await getArtworkBySlug(slug);
  } catch {
    notFound();
  }

  const related = await getRelatedArtworks(
    artwork._id,
    typeof artwork.category === 'object' ? artwork.category._id : artwork.category,
  ).catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.title,
    description: artwork.description,
    artMedium: artwork.material,
    // Peças "Somente exposição" não estão à venda: sem bloco de oferta.
    ...(artwork.status === 'EXHIBITION'
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            price: artwork.price,
            priceCurrency: 'BRL',
            availability: artwork.status === 'AVAILABLE'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          },
        }),
    artist: {
      '@type': 'Person',
      name: 'André Valença',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtworkDetail artwork={artwork} related={related} />
    </>
  );
}
