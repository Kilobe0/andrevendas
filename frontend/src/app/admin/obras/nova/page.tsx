'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Inbox, Frame, Plus, ArrowLeft, X } from 'lucide-react';
import { getCategories, createArtwork, uploadImage, Category, getImageUrl } from '@/lib/api';
import styles from './page.module.css';

export default function NovaObraPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '', slug: '', description: '', material: '', dimensions: '',
    price: '', status: 'AVAILABLE', featured: false, category: '',
  });

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getCategories().then(setCategories).catch(() => {});
  }, []);

  function updateForm(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'title') {
      const slug = (v as string).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm(f => ({ ...f, title: v as string, slug }));
    }
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
    setLoading(true);
    try {
      await createArtwork({
        ...form,
        price: Number(form.price),
        images,
      } as any, token);
      router.push('/admin/obras');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
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
          <Link href="/admin/obras" className={styles.navItem}><Frame size={16} strokeWidth={1.5} /> Obras</Link>
          <Link href="/admin/obras/nova" className={`${styles.navItem} ${styles.active}`}><Plus size={16} strokeWidth={1.5} /> Nova Obra</Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Nova Obra</h1>
          <Link href="/admin/obras" className="btn btn-outline"><ArrowLeft size={16} strokeWidth={1.5} /> Voltar</Link>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formColumns}>
            {/* Left column */}
            <div className={styles.formLeft}>
              <section className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Informações básicas</h2>
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={form.title} onChange={e => updateForm('title', e.target.value)} required id="obra-title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug (URL)</label>
                  <input className="form-input" value={form.slug} onChange={e => updateForm('slug', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição artística *</label>
                  <textarea className="form-textarea" rows={5} value={form.description}
                    onChange={e => updateForm('description', e.target.value)} required id="obra-desc" />
                </div>
                <div className={styles.row}>
                  <div className="form-group">
                    <label className="form-label">Material *</label>
                    <input className="form-input" value={form.material} onChange={e => updateForm('material', e.target.value)} required id="obra-material" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dimensões</label>
                    <input className="form-input" value={form.dimensions} onChange={e => updateForm('dimensions', e.target.value)} placeholder="ex: 60 × 80 cm" />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className="form-group">
                    <label className="form-label">Preço (R$) *</label>
                    <input className="form-input" type="number" min="0" step="0.01" value={form.price}
                      onChange={e => updateForm('price', e.target.value)} required id="obra-price" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => updateForm('status', e.target.value)}>
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
                <div className={styles.row}>
                  <div className="form-group">
                    <label className="form-label">Categoria *</label>
                    <select className="form-select" value={form.category} onChange={e => updateForm('category', e.target.value)} required id="obra-category">
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', paddingTop: '1.5rem' }}>
                      <input type="checkbox" checked={form.featured} onChange={e => updateForm('featured', e.target.checked)} id="obra-featured" />
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
            <button type="submit" className="btn btn-primary" disabled={loading} id="submit-obra-btn">
              {loading ? 'Salvando...' : 'Salvar obra'}
            </button>
            <Link href="/admin/obras" className="btn btn-outline">Cancelar</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
