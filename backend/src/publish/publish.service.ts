import { Injectable, Logger } from '@nestjs/common';

// O site público é estático (build no GitHub Actions → Cloudflare Pages), então
// mudanças no catálogo só aparecem depois de um novo build. Este serviço dispara
// o workflow de deploy via API do GitHub (workflow_dispatch) sempre que o
// catálogo muda — com debounce para agrupar uma sessão de edições num build só.
@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);
  private timer: NodeJS.Timeout | null = null;
  private lastDispatchAt: number | null = null;

  // PAT fine-grained com permissão Actions: read/write no repositório.
  private readonly token = process.env.GITHUB_TOKEN ?? '';
  private readonly repo = process.env.GITHUB_REPO ?? 'Kilobe0/andrevendas';
  private readonly workflow = process.env.GITHUB_WORKFLOW ?? 'deploy-cloudflare.yml';
  private readonly debounceMs = Number(process.env.PUBLISH_DEBOUNCE_MS ?? 3 * 60 * 1000);

  get configured(): boolean {
    return this.token !== '';
  }

  // Agenda um rebuild do site. Chamadas em sequência (várias obras editadas)
  // reiniciam o timer e viram um único deploy ao final.
  schedule(reason: string): void {
    if (!this.configured) {
      this.logger.warn(
        `Site NÃO será republicado automaticamente (${reason}) — defina GITHUB_TOKEN no Fly.`,
      );
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.logger.log(`Rebuild do site agendado em ${Math.round(this.debounceMs / 1000)}s (${reason})`);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.dispatch(reason);
    }, this.debounceMs);
    // Máquina do Fly pode hibernar, mas só depois de fechar as conexões; o timer
    // não impede o auto-stop — unref evita segurar o processo num shutdown.
    this.timer.unref?.();
  }

  // Dispara o deploy imediatamente (botão "Publicar site" do admin).
  async publishNow(): Promise<{ ok: boolean; message: string }> {
    if (!this.configured) {
      return {
        ok: false,
        message: 'Publicação automática não configurada (GITHUB_TOKEN ausente no servidor).',
      };
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const ok = await this.dispatch('publicação manual pelo admin');
    return ok
      ? { ok: true, message: 'Deploy iniciado — o site atualiza em 2 a 4 minutos.' }
      : { ok: false, message: 'Falha ao acionar o deploy no GitHub. Veja os logs do servidor.' };
  }

  status(): { configured: boolean; pending: boolean; lastDispatchAt: number | null } {
    return {
      configured: this.configured,
      pending: this.timer !== null,
      lastDispatchAt: this.lastDispatchAt,
    };
  }

  private async dispatch(reason: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.repo}/actions/workflows/${this.workflow}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': 'andrevendas-api',
          },
          body: JSON.stringify({ ref: 'main' }),
        },
      );
      // Sucesso é 204 sem corpo.
      if (res.status === 204) {
        this.lastDispatchAt = Date.now();
        this.logger.log(`Workflow ${this.workflow} disparado (${reason})`);
        return true;
      }
      const body = await res.text().catch(() => '');
      this.logger.error(`GitHub respondeu ${res.status} ao disparar o deploy: ${body}`);
      return false;
    } catch (err) {
      this.logger.error(`Erro ao chamar a API do GitHub: ${(err as Error).message}`);
      return false;
    }
  }
}
