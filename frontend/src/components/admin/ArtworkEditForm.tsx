'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import { updateArtwork, uploadImage, Artwork, Category, getImageUrl } from '@/lib/api';
import { toast } from '@/components/admin/Toast';
// Mesmo visual da tela "Nova Obra" (formulário compartilhado com a página e o modal).
import styles from '@/app/admin/obras/nova/page.module.css';

interface Props {
  artwork: Artwork;
  categories: Category[];
  token: string;
  onSaved: (updated: Artwork) => void;
  onCancel: () => void;
}

export default function ArtworkEditForm({ artwork, categories, token, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(artwork.images || []);

  const [form, setForm] = useState({
    title: artwork.title,
    slug: artwork.slug,
    description: artwork.description || '',
    material: artwork.material,
    dimensions: artwork.dimensions || '',
    // Banco guarda kg; o campo do admin trabalha em gramas.
    weight: artwork.weight != null ? String(Math.round(artwork.weight * 1000)) : '',
    price: String(artwork.price),
    quantity: String(artwork.quantity ?? 1),
    status: artwork.status,
    featured: artwork.featured,
    category: artwork.category?._id || '',
  });

  function updateField(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(e.target.files[0], token);
      setImages(prev => [...prev, url]);
      toast('Imagem enviada');
    } catch (err: any) {
      toast(err.message || 'Erro ao enviar a imagem', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) { toast('Selecione uma categoria', 'error'); return; }
    if (images.length === 0) { toast('Adicione ao menos uma imagem', 'error'); return; }
    // Aceita "300", "2390", "2.390", "300g"... — só os dígitos importam.
    const grams = form.weight.replace(/\D/g, '');
    if (form.weight.trim() !== '' && grams === '') {
      toast('Peso inválido — digite em gramas, ex: 300', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateArtwork(artwork._id, {
        ...form,
        price: Number(form.price),
        quantity: Math.max(0, Number(form.quantity) || 0),
        // Admin digita em gramas; o banco guarda em kg (padrão das APIs de frete).
        weight: grams === '' ? undefined : Number(grams) / 1000,
        images,
      } as any, token);
      toast(`Alterações de "${form.title}" salvas — peso: ${grams ? `${grams} g` : 'não informado'}`);
      onSaved(updated);
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar as alterações', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
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
              <label className="form-label">Descrição artística</label>
              <textarea className="form-textarea" rows={5} value={form.description}
                onChange={e => updateField('description', e.target.value)} id="obra-desc" />
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
              <label className="form-label">Peso (gramas)</label>
              {/* type="text": input number engole silenciosamente valores com
                  vírgula/unidade ("2,390", "300g") e salvava sem peso. */}
              <input className="form-input" type="text" inputMode="numeric" value={form.weight}
                onChange={e => updateField('weight', e.target.value)} placeholder="ex: 300 ou 2390" id="obra-weight" />
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
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
