import Link from 'next/link';
import Image from 'next/image';
import { Artwork, formatPrice, getImageUrl } from '@/lib/api';
import styles from './ArtworkCard.module.css';

interface Props {
  artwork: Artwork;
  priority?: boolean;
}

export default function ArtworkCard({ artwork, priority = false }: Props) {
  const isAvailable = artwork.status === 'AVAILABLE';

  return (
    <Link href={`/obra/${artwork.slug}`} className={styles.card} id={`artwork-${artwork.slug}`}>
      <div className={styles.imageWrapper}>
        <Image
          src={getImageUrl(artwork.images[0])}
          alt={artwork.title}
          fill
          style={{ objectFit: 'cover' }}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className={styles.overlay}>
          <span className={styles.viewLabel}>Ver obra →</span>
        </div>
        {!isAvailable && (
          <div className={styles.soldStamp}>Indisponível</div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.category}>{artwork.category?.name}</div>
        <h3 className={styles.title}>{artwork.title}</h3>
        <div className={styles.meta}>
          <span className={styles.material}>{artwork.material}</span>
          <span className={`badge ${isAvailable ? 'badge-available' : 'badge-sold'}`}>
            {isAvailable ? 'Disponível' : 'Vendida'}
          </span>
        </div>
        <div className={styles.price}>{formatPrice(artwork.price)}</div>
      </div>
    </Link>
  );
}
