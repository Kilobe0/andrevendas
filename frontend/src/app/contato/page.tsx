'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import styles from './page.module.css';

export default function ContatoPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Mock: in production, connect to a mail API
    setSent(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-header-divider>
        <div className="container--narrow">
          <span className="label">Fale conosco</span>
          <h1 className={styles.heroTitle}>Contato</h1>
        </div>
      </div>

      <div className="container--narrow">
        <div className={styles.layout}>
          <div className={styles.info}>
            <div className={styles.infoBlock}>
              <h2 className={styles.infoTitle}>Atendimento</h2>
              <p className={styles.infoText}>
                Interessado em uma obra, encomenda ou exposição? Envie uma mensagem
                pelo formulário ou fale diretamente pelos canais abaixo.
              </p>
            </div>

            <div className={styles.contacts}>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>E-mail</span>
                <a href="mailto:andrevalencaguimaraes@gmail.com" className={styles.contactValue}>
                  andrevalencaguimaraes@gmail.com
                </a>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>WhatsApp</span>
                <a href="https://wa.me/5531982409191" className={styles.contactValue}>
                  +55 (31) 98240-9191
                </a>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Instagram</span>
                <a href="https://instagram.com/andre.valenca.guimaraes" className={styles.contactValue}>
                  @andre.valenca.guimaraes
                </a>
              </div>
            </div>
          </div>

          <div className={styles.formWrapper}>
            {sent ? (
              <div className={styles.successMsg}>
                <span className={styles.successIcon} aria-hidden="true"><CheckCircle2 size={30} strokeWidth={1.5} /></span>
                <h3>Mensagem enviada!</h3>
                <p>Obrigado pelo contato. Retornaremos em breve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    id="contact-name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                    id="contact-email"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mensagem</label>
                  <textarea
                    className="form-textarea"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    required
                    rows={5}
                    id="contact-message"
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} id="contact-submit">
                  Enviar mensagem
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
