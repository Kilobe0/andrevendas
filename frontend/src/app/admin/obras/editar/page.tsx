'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Inbox, Frame, Plus, ArrowLeft, X } from 'lucide-react';
import { getArtworks, getCategories, updateArtwork, uploadImage, Category, getImageUrl } from '@/lib/api';
// Reaproveita o visual da tela "Nova Obra" (mesmo layout de formulário).
import styles from '../nova/page.module.css';

function EditarObraInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') || '';

  const [token, setToken] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '', slug: '', description: '', material: '', dimensions: '', weight: '',
    price: '', quantity: '1', status: 'AVAILABLE', featured: false, category: '',
  });

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getCategories().then(setCategories).catch(() => {});

    // Sem endpoint de busca por id: carrega a lista e localiza a obra.
    getArtworks()
      .then(list => {
        const a = list.find(x => x._id === id);
        if (!a) { setNotFound(true); return; }
        setForm({
          title: a.title,
          slug: a.slug,
          description: a.description || '',
          material: a.material,
          dimensions: a.dimensions || '',
          weight: a.weight != null ? String(a.weight) : '',
          price: String(a.price),
          quantity: String(a.quantity ?? 1),
          status: a.status,
          featured: a.featured,
          category: a.category?._id || '',
        });
        setImages(a.images || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingData(false));
  }, [id]);

  function updateField(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(e.target.files[0], token);
      setImages(prev => [...prev, url]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) { alert('Selecione uma categoria'); return; }
    if (images.length === 0) { alert('Adicione ao menos uma imagem'); return; }
    setSaving(true);
    try {
      await updateArtwork(id, {
        ...form,
        price: Number(form.price),
        quantity: Math.max(0, Number(form.quantity) || 0),
        weight: form.weight === '' ? undefined : Number(form.weight),
        images,
      } as any, token);
      router.push('/admin/obras');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>André Valença</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin/dashboard" className={styles.navItem}><LayoutDashboard size={16} strokeWidth={1.5} /> Dashboard</Link>
          <Link href="/admin/pedidos" className={styles.navItem}><Inbox size={16} strokeWidth={1.5} /> Pedidos</Link>
          <Link href="/admin/obras" className={`${styles.navItem} ${styles.active}`}><Frame size={16} strokeWidth={1.5} /> Obras</Link>
          <Link href="/admin/obras/nova" className={styles.navItem}><Plus size={16} strokeWidth={1.5} /> Nova Obra</Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Editar Obra</h1>
          <Link href="/admin/obras" className="btn btn-outline"><ArrowLeft size={16} strokeWidth={1.5} /> Voltar</Link>
        </div>

        {loadingData ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Carregando...</p>
        ) : notFound ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Obra não encontrada. <Link href="/admin/obras" style={{ color: 'var(--accent-warm)' }}>Voltar para a lista</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formColumns}>
              {/* Left column */}
              <div className={styles.formLeft}>
                <section className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>Informações básicas</h2>
                  <div className="form-group">
                    <label className="form-label">Título *</label>
                    <input className="form-input" value={form.title} onChange={e => updateField('title', e.target.value)} required id="obra-title" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slug (URL)</label>
                    <input className="form-input" value={form.slug} onChange={e => updateField('slug', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descrição artística *</label>
                    <textarea className="form-textarea" rows={5} value={form.description}
                      onChange={e => updateField('description', e.target.value)} required id="obra-desc" />
                  </div>
                  <div className={styles.row}>
                    <div className="form-group">
                      <label className="form-label">Material *</label>
                      <input className="form-input" value={form.material} onChange={e => updateField('material', e.target.value)} required id="obra-material" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dimensões</label>
                      <input className="form-input" value={form.dimensions} onChange={e => updateField('dimensions', e.target.value)} placeholder="ex: 60 × 80 cm" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Peso (kg)</label>
                    <input className="form-input" type="number" min="0" step="0.001" value={form.weight}
                      onChange={e => updateField('weight', e.target.value)} placeholder="ex: 2.5" id="obra-weight" />
                  </div>
                  <div className={styles.row}>
                    <div className="form-group">
                      <label className="form-label">Preço (R$) *</label>
                      <input className="form-input" type="number" min="0" step="0.01" value={form.price}
                        onChange={e => updateField('price', e.target.value)} required id="obra-price" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={form.status} onChange={e => updateField('status', e.target.value)}>
                        <option value="AVAILABLE">Disponível</option>
                        <option value="RESERVED">Reservada</option>
                        <option value="SOLD">Vendida</option>
                        <option value="EXHIBITION">Acervo (não à venda)</option>
                      </select>
                    </div>
                  </div>
                  {form.status === 'EXHIBITION' && (
                    <p className={styles.uploadNote}>
                      Peça de acervo, exibida na galeria sem venda. Deixe o preço em <strong>0</strong> para
                      ocultá-lo, ou informe um valor para exibir <strong>“Sob consulta”</strong>.
                    </p>
                  )}
                  <div className="form-group">
                    <label className="form-label">Unidades disponíveis</label>
                    <input className="form-input" type="number" min="0" step="1" value={form.quantity}
                      onChange={e => updateField('quantity', e.target.value)} id="obra-quantity" />
                  </div>
                  {Number(form.quantity) > 1 && (
                    <p className={styles.uploadNote}>
                      Obra em série (cópias idênticas). O preço vale <strong>por unidade</strong>; a cada venda
                      o estoque diminui e a obra só fica “Vendida” quando zerar.
                    </p>
                  )}
                  <div className={styles.row}>
                    <div className="form-group">
                      <label className="form-label">Categoria *</label>
                      <select className="form-select" value={form.category} onChange={e => updateField('category', e.target.value)} required id="obra-category">
                        <option value="">Selecione...</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', paddingTop: '1.5rem' }}>
                        <input type="checkbox" checked={form.featured} onChange={e => updateField('featured', e.target.checked)} id="obra-featured" />
                        <span className="form-label" style={{ margin: 0 }}>Obra em destaque</span>
                      </label>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right column: images */}
              <div className={styles.formRight}>
                <section className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>Imagens</h2>
                  <div className={styles.imagesGrid}>
                    {images.map((img, i) => (
                      <div key={i} className={styles.imageThumb}>
                        <Image src={getImageUrl(img)} alt="" fill style={{ objectFit: 'cover' }} />
                        <button type="button" className={styles.removeImage} onClick={() => setImages(p => p.filter((_, j) => j !== i))} aria-label="Remover imagem"><X size={14} strokeWidth={2} /></button>
                      </div>
                    ))}
                    <label className={styles.uploadBtn} id="upload-image-btn">
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                      {uploading ? (
                        <span>Enviando...</span>
                      ) : (
                        <>
                          <Plus className={styles.uploadIcon} size={28} strokeWidth={1.5} />
                          <span>Adicionar imagem</span>
                        </>
                      )}
                    </label>
                  </div>
                  <p className={styles.uploadNote}>JPG, PNG ou WebP. Máximo 10MB por arquivo.</p>
                </section>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary" disabled={saving} id="submit-obra-btn">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <Link href="/admin/obras" className="btn btn-outline">Cancelar</Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function EditarObraPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <EditarObraInner />
    </Suspense>
  );
}
