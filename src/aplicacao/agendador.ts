import type { Logger } from '../shared/logger.js';

/** Dispara uma tarefa imediatamente e depois a cada N minutos. */
export class Agendador {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly tarefa: () => Promise<void>,
    private readonly intervaloMin: number,
    private readonly logger: Logger,
  ) {}

  iniciar(): void {
    void this.disparar();
    this.timer = setInterval(() => void this.disparar(), this.intervaloMin * 60_000);
    this.timer.unref?.();
  }

  parar(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async disparar(): Promise<void> {
    try {
      await this.tarefa();
    } catch (erro) {
      // O coletor já trata seus próprios erros; isto é a última rede de proteção
      // para que uma exceção inesperada não mate o processo.
      this.logger.erro(`erro não tratado no ciclo agendado: ${(erro as Error).message}`);
    }
  }
}
