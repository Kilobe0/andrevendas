import { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'O Artista',
  description:
    'André Valença Guimarães — artista plástico, escultor e pintor. Trajetória, processo criativo e exposições.',
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
          <figure className={`${styles.figure} ${styles.figurePortrait}`}>
            <Image
              src="/artista/retrato.jpeg"
              alt="Retrato de André Valença"
              width={418}
              height={437}
              sizes="(max-width: 768px) 100vw, 420px"
              priority
            />
            <figcaption className={styles.figureCaption}>André Valença</figcaption>
          </figure>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Trajetória</h2>
            <p>
              Nascido em Recife (PE) em 1979 e imerso desde a infância na efervescência
              cultural e na arte popular de Olinda, André Valença Guimarães manifestou sua
              vocação artística de forma precoce e espontânea. Aos 8 anos de idade, esculpiu
              de maneira intuitiva uma imagem de Jesus Crucificado na madeira da cabeceira de
              sua cama, revelando um talento nato que impressionou a família.
            </p>
            <p>
              Aos 12 anos, mudou-se para Sete Lagoas (MG), cidade onde reside até hoje. Sua
              rica ancestralidade artística transita pelo Nordeste, manifestando-se na música
              da família Valença e nas artes visuais da família Guimarães em Minas Gerais. É
              graduado em Psicologia pela PUC-MG — formação que ampliou sua percepção sobre a
              complexidade das emoções e das relações humanas. Foi justamente durante o
              período universitário que suas primeiras obras autorais ganharam vida.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Processo Criativo</h2>
            <p>
              O trabalho de André Valença é movido pelo fascínio de traduzir a complexidade
              da mente e das emoções humanas em formas tangíveis. Suas obras — expressas em
              esculturas, pinturas e desenhos — nascem de um olhar investigativo, que busca
              capturar no rosto e na expressão o que vai além do olhar físico.
            </p>
            <p>
              Sua produção une a liberdade da arte conceitual ao rigor técnico. Para André, o
              processo criativo funciona como um rio: diante de qualquer obstáculo técnico ou
              conceitual, ele se debruça sobre o desafio para encontrar novos fluxos de
              expressão. Essa postura experimental o acompanha desde o início da carreira,
              quando utilizava suportes inusitados como cartões telefônicos para realizar
              impressões de tinta a óleo sobre o papel. Hoje, esse espírito inovador alia-se
              ao refinamento técnico obtido através do estudo da pintura a óleo no Atelier
              Josemmar.
            </p>
            <p>
              André Valença Guimarães é um artista que está em constante evolução. Sua jornada
              artística é marcada pela busca por um estilo próprio e pela experimentação com
              diversas formas de arte. Com uma trajetória única e uma paixão pela arte, André
              continua a criar obras que refletem sua visão, maturidade e sensibilidade.
            </p>

            <figure className={`${styles.figure} ${styles.figureWide}`}>
              <Image
                src="/artista/atelie.jpeg"
                alt="André Valença trabalhando em uma de suas obras"
                width={637}
                height={556}
                sizes="(max-width: 768px) 100vw, 720px"
              />
              <figcaption className={styles.figureCaption}>
                O artista durante o processo de criação
              </figcaption>
            </figure>
          </section>

          <blockquote className={styles.quote}>
            "O processo criativo funciona como um rio: diante de qualquer obstáculo, me
            debruço sobre o desafio para encontrar novos fluxos de expressão."
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
            <p>Quer conhecer uma obra de perto ou conversar sobre um trabalho?</p>
            <a href="/contato" className="btn btn-primary">Entrar em contato</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const TIMELINE = [
  {
    year: '2026',
    title: 'Exposição e comercialização de peças na Ilha Collab',
    place: 'Ilha do Milito — Sete Lagoas (MG)',
  },
  {
    year: '2025',
    title: 'Exposição Coletiva na Fenex',
    place: 'Feira de Negócios e Conexões de Sete Lagoas e Região',
  },
  {
    year: '2015',
    title: 'Exposição Individual "Esboços e Escorços"',
    place: 'Galeria Myralda / Casa da Cultura — Sete Lagoas (MG)',
  },
  {
    year: '2008',
    title: 'Mostras no Centro Cultural Nhô Quim Drummond',
    place:
      'Casarão — Sete Lagoas (MG). Coletiva "Ponto de Intervenção" e 1ª Mostra Fet Lúmina 10 anos, com a instalação autoral "Mãos que se constroem à luz da experiência"',
  },
  {
    year: '2007',
    title: 'Mostra "Desenvolvimento 12"',
    place: 'Galeria da Escola de Belas Artes da UFMG — Belo Horizonte (MG)',
  },
  {
    year: '2005',
    title: 'Exposição "Novos Talentos" no Centro Loyola e 1ª Mostra do Atelier Arte Minas',
    place: 'Tribunal de Contas do Estado de MG — Belo Horizonte (MG)',
  },
];
