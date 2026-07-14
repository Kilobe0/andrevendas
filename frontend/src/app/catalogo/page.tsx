'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, ChevronDown } from 'lucide-react';
import { getArtworks, getCategories, Artwork, Category } from '@/lib/api';
import ArtworkCard from '@/components/gallery/ArtworkCard';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponíveis',
  SOLD: 'Vendidas',
  EXHIBITION: 'Acervo',
};

const MATERIALS = [
  'Bronze reconstituído',
  'Cerâmica',
  'Ferro',
  'Óleo sobre tela',
  'Grafite',
];

function CatalogoContent() {
  const searchParams = useSearchParams();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('categoria') || '');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const cat = categories.find(c => c.slug === categoryFilter);
    getArtworks({
      ...(cat ? { category: cat._id } : {}),
      ...(materialFilter ? { material: materialFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    })
      .then(setArtworks)
      .catch(() => setArtworks([]))
      .finally(() => setLoading(false));
  }, [categoryFilter, materialFilter, statusFilter, categories]);

  function clearFilters() {
    setCategoryFilter('');
    setMaterialFilter('');
    setStatusFilter('');
  }

  const hasFilters = categoryFilter || materialFilter || statusFilter;

  // Labels for active filter chips
  const activeChips = [
    categoryFilter && { key: 'category', label: categories.find(c => c.slug === categoryFilter)?.name || categoryFilter, clear: () => setCategoryFilter('') },
    materialFilter && { key: 'material', label: materialFilter, clear: () => setMaterialFilter('') },
    statusFilter && { key: 'status', label: STATUS_LABELS[statusFilter] ?? statusFilter, clear: () => setStatusFilter('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  // Disponíveis no topo, vendidas depois e acervo (EXHIBITION) sempre por último.
  // sort é estável, então a ordem do backend (mais recentes primeiro) se mantém
  // dentro de cada grupo. Vale com ou sem filtros ativos.
  const statusRank = (s: string) => (s === 'AVAILABLE' ? 0 : s === 'EXHIBITION' ? 2 : 1);
  const sortedArtworks = [...artworks].sort(
    (a, b) => statusRank(a.status) - statusRank(b.status),
  );

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader} data-header-divider>
        <div className="container">
          <span className="label">Galeria</span>
          <h1 className={styles.pageTitle}>Catálogo de Obras</h1>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* Toggle de filtros — visível só no mobile */}
          <button
            className={styles.filtersToggle}
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters"
          >
            Filtros
            {activeChips.length > 0 && (
              <span className={styles.filtersToggleCount}>{activeChips.length}</span>
            )}
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              aria-hidden="true"
              className={filtersOpen ? styles.chevronOpen : undefined}
            />
          </button>

          {/* Sidebar */}
          <aside
            id="catalog-filters"
            className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}
            aria-label="Filtros"
          >
            <div className={styles.filterSection}>
              <span className={styles.filterTitle}>Categoria</span>
              <div className={styles.filterOptions}>
                <button
                  className={`${styles.filterBtn} ${!categoryFilter ? styles.active : ''}`}
                  onClick={() => setCategoryFilter('')}
                  aria-pressed={!categoryFilter}
                >
                  Todas
                  {!categoryFilter && <span className={styles.filterBtnDot} aria-hidden="true" />}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat._id}
                    className={`${styles.filterBtn} ${categoryFilter === cat.slug ? styles.active : ''}`}
                    onClick={() => setCategoryFilter(cat.slug)}
                    aria-pressed={categoryFilter === cat.slug}
                    id={`filter-cat-${cat.slug}`}
                  >
                    {cat.name}
                    {categoryFilter === cat.slug && <span className={styles.filterBtnDot} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterTitle}>Material</span>
              <div className={styles.filterOptions}>
                <button
                  className={`${styles.filterBtn} ${!materialFilter ? styles.active : ''}`}
                  onClick={() => setMaterialFilter('')}
                  aria-pressed={!materialFilter}
                >
                  Todos
                  {!materialFilter && <span className={styles.filterBtnDot} aria-hidden="true" />}
                </button>
                {MATERIALS.map(mat => (
                  <button
                    key={mat}
                    className={`${styles.filterBtn} ${materialFilter === mat ? styles.active : ''}`}
                    onClick={() => setMaterialFilter(mat)}
                    aria-pressed={materialFilter === mat}
                  >
                    {mat}
                    {materialFilter === mat && <span className={styles.filterBtnDot} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterTitle}>Disponibilidade</span>
              <div className={styles.filterOptions}>
                <button
                  className={`${styles.filterBtn} ${!statusFilter ? styles.active : ''}`}
                  onClick={() => setStatusFilter('')}
                  aria-pressed={!statusFilter}
                >
                  Todas
                  {!statusFilter && <span className={styles.filterBtnDot} aria-hidden="true" />}
                </button>
                <button
                  className={`${styles.filterBtn} ${statusFilter === 'AVAILABLE' ? styles.active : ''}`}
                  onClick={() => setStatusFilter('AVAILABLE')}
                  aria-pressed={statusFilter === 'AVAILABLE'}
                  id="filter-available"
                >
                  Disponíveis
                  {statusFilter === 'AVAILABLE' && <span className={styles.filterBtnDot} aria-hidden="true" />}
                </button>
                <button
                  className={`${styles.filterBtn} ${statusFilter === 'SOLD' ? styles.active : ''}`}
                  onClick={() => setStatusFilter('SOLD')}
                  aria-pressed={statusFilter === 'SOLD'}
                  id="filter-sold"
                >
                  Vendidas
                  {statusFilter === 'SOLD' && <span className={styles.filterBtnDot} aria-hidden="true" />}
                </button>
                <button
                  className={`${styles.filterBtn} ${statusFilter === 'EXHIBITION' ? styles.active : ''}`}
                  onClick={() => setStatusFilter('EXHIBITION')}
                  aria-pressed={statusFilter === 'EXHIBITION'}
                  id="filter-exhibition"
                >
                  Acervo
                  {statusFilter === 'EXHIBITION' && <span className={styles.filterBtnDot} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {hasFilters && (
              <button
                className={styles.clearBtn}
                onClick={clearFilters}
                id="clear-filters-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}
              >
                <X size={13} strokeWidth={2} aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </aside>

          {/* Grid */}
          <div className={styles.gridArea}>
            <div className={styles.resultsBar} role="status" aria-live="polite">
              <span className={styles.resultsCount}>
                {loading ? 'Carregando...' : `${artworks.length} obra${artworks.length !== 1 ? 's' : ''}`}
              </span>
              {/* Active filter chips */}
              {activeChips.length > 0 && (
                <div className={styles.activeFilters} aria-label="Filtros ativos">
                  {activeChips.map(chip => (
                    <button
                      key={chip.key}
                      className={styles.filterChip}
                      onClick={chip.clear}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}
                    >
                      {chip.label} <X size={12} strokeWidth={2} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className={styles.grid} aria-busy="true" aria-label="Carregando obras">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <div className={styles.skeletonImage} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLineShort} />
                  </div>
                ))}
              </div>
            ) : artworks.length === 0 ? (
              <div className={styles.empty} role="status">
                <span className={styles.emptyIcon} aria-hidden="true">◻</span>
                <h2 className={styles.emptyTitle}>Nenhuma obra encontrada</h2>
                <p className={styles.emptyText}>
                  Tente ajustar os filtros para ver mais resultados.
                </p>
                <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className={styles.grid}>
                {sortedArtworks.map((artwork, i) => (
                  <div
                    key={artwork._id}
                    className={styles.gridItem}
                    style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                  >
                    <ArtworkCard artwork={artwork} priority={i < 3} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense>
      <CatalogoContent />
    </Suspense>
  );
}
