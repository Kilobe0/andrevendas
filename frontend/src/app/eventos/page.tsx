import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Eventos e Mostras',
  description:
    'Registros de exposições, mostras de arte e eventos com a participação de André Valença.',
  // Página oculta por enquanto (sem links no site) — não indexar até o lançamento.
  robots: { index: false, follow: false },
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// Cada evento pode ter fotos em frontend/public/eventos/ — basta adicionar os
// arquivos e listar os caminhos (relativos a /eventos/) no array `photos`.
// Eventos sem fotos exibem um espaço reservado discreto até os registros chegarem.
interface Evento {
  year: string;
  title: string;
  place: string;
  description?: string;
  photos: { src: string; caption?: string }[];
}

const EVENTOS: Evento[] = [
  {
    year: '2026',
    title: 'Exposição e comercialização de peças na Ilha Collab',
    place: 'Ilha do Milito — Sete Lagoas (MG)',
    description:
      'Mostra com peças do acervo e obras à venda, em diálogo com o público da Ilha Collab.',
    photos: [],
  },
  {
    year: '2025',
    title: 'Exposição Coletiva na Fenex',
    place: 'Feira de Negócios e Conexões de Sete Lagoas e Região',
    description:
      'Participação na coletiva da Fenex, aproximando a produção autoral do circuito regional.',
    photos: [],
  },
  {
    year: '2015',
    title: 'Exposição Individual "Esboços e Escorços"',
    place: 'Galeria Myralda / Casa da Cultura — Sete Lagoas (MG)',
    photos: [],
  },
  {
    year: '2008',
    title: 'Mostras no Centro Cultural Nhô Quim Drummond',
    place: 'Casarão — Sete Lagoas (MG)',
    description:
      'Coletiva "Ponto de Intervenção" e 1ª Mostra Fet Lúmina 10 anos, com a instalação autoral "Mãos que se constroem à luz da experiência".',
    photos: [],
  },
  {
    year: '2007',
    title: 'Mostra "Desenvolvimento 12"',
    place: 'Galeria da Escola de Belas Artes da UFMG — Belo Horizonte (MG)',
    photos: [],
  },
  {
    year: '2005',
    title: 'Exposição "Novos Talentos" no Centro Loyola e 1ª Mostra do Atelier Arte Minas',
    place: 'Tribunal de Contas do Estado de MG — Belo Horizonte (MG)',
    photos: [],
  },
];

export default function EventosPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero} data-header-divider>
        <div className={styles.heroText}>
          <span className="label">Registros</span>
          <h1 className={styles.heroTitle}>Eventos &amp; Mostras</h1>
          <p className={styles.heroSubtitle}>
            Exposições, mostras de arte e participações
          </p>
        </div>
      </div>

      <div className="container--narrow">
        <div className={styles.content}>
          {EVENTOS.map((evento, i) => (
            <article key={i} className={styles.event}>
              <header className={styles.eventHeader}>
                <span className={styles.eventYear}>{evento.year}</span>
                <div className={styles.eventHeading}>
                  <h2 className={styles.eventTitle}>{evento.title}</h2>
                  <span className={styles.eventPlace}>{evento.place}</span>
                </div>
              </header>

              {evento.description && (
                <p className={styles.eventDesc}>{evento.description}</p>
              )}

              {evento.photos.length > 0 ? (
                <div className={styles.photoGrid}>
                  {evento.photos.map((photo, j) => (
                    <figure key={j} className={styles.photo}>
                      <Image
                        src={`${basePath}/eventos/${photo.src}`}
                        alt={photo.caption || `${evento.title} — registro ${j + 1}`}
                        width={800}
                        height={600}
                        sizes="(max-width: 768px) 100vw, 440px"
                      />
                      {photo.caption && (
                        <figcaption className={styles.photoCaption}>
                          {photo.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              ) : (
                <div className={styles.photoPlaceholder} aria-hidden="true">
                  <span>Registros fotográficos em breve</span>
                </div>
              )}
            </article>
          ))}

          <div className={styles.cta}>
            <p>
              Quer convidar o artista para uma exposição, mostra ou evento
              cultural?
            </p>
            <Link href="/contato" className="btn btn-primary">
              Entrar em contato
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
