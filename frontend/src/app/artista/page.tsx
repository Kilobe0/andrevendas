import { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'O Artista',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
};

export default function ArtistaPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero} data-header-divider>
        <div className={styles.heroText}>
          <span className="label">O artista</span>
          <h1 className={styles.heroTitle}>André Valença</h1>
          <p className={styles.heroSubtitle}>
            Artista plástico, escultor e pintor
          </p>
        </div>
        <div className={styles.heroDivider} />
      </div>

      <div className="container--narrow">
        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Trajetória</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
              nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
              eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
              in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Processo Criativo</h2>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
              doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
              veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit,
              sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt,
              neque porro quisquam est qui dolorem ipsum quia dolor sit amet.
            </p>
          </section>

          <blockquote className={styles.quote}>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            <cite>— André Valença</cite>
          </blockquote>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Exposições e Reconhecimentos</h2>
            <div className={styles.timeline}>
              {TIMELINE.map((item, i) => (
                <div key={i} className={styles.timelineItem}>
                  <span className={styles.timelineYear}>{item.year}</span>
                  <div className={styles.timelineContent}>
                    <strong>{item.title}</strong>
                    <span>{item.place}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.cta}>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor?</p>
            <a href="/contato" className="btn btn-primary">Entrar em contato</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const TIMELINE = [
  { year: '2023', title: 'Lorem Ipsum Dolor — Sit Amet', place: 'Consectetur Adipiscing, São Paulo' },
  { year: '2022', title: 'Sed Do Eiusmod — Tempor Incididunt', place: 'Ut Labore, Rio de Janeiro' },
  { year: '2021', title: 'Dolore Magna Aliqua', place: 'Ut Enim Ad Minim, Porto Alegre' },
  { year: '2019', title: 'Quis Nostrud — Exercitation Ullamco', place: 'Laboris Nisi Ut Aliquip' },
  { year: '2017', title: 'Duis Aute Irure Dolor', place: 'In Reprehenderit, São Paulo' },
];
