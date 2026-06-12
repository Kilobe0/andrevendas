import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArtworkBySlug, getRelatedArtworks, formatPrice, getImageUrl } from '@/lib/api';
import ArtworkDetail from '@/components/gallery/ArtworkDetail';

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
    offers: {
      '@type': 'Offer',
      price: artwork.price,
      priceCurrency: 'BRL',
      availability: artwork.status === 'AVAILABLE'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
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
