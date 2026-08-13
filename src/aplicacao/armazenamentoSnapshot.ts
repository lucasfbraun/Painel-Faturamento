import fs from 'node:fs/promises';
import path from 'node:path';
import type { Snapshot } from '../dominio/tipos.js';
import type { Logger } from '../shared/logger.js';

/**
 * Persiste o último snapshot em disco para que a tela abra preenchida logo após
 * um restart do container, antes mesmo do primeiro ciclo terminar.
 *
 * Falhas aqui são registradas mas nunca derrubam o painel: o cache é conveniência,
 * não fonte da verdade.
 */
export class ArmazenamentoSnapshot {
  constructor(
    private readonly arquivo: string,
    private readonly logger: Logger,
  ) {}

  async carregar(): Promise<Snapshot | null> {
    try {
      const conteudo = await fs.readFile(this.arquivo, 'utf8');
      const dados = JSON.parse(conteudo) as Snapshot;
      return Array.isArray(dados.pedidos) ? dados : null;
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.aviso(`não foi possível ler o snapshot salvo: ${(erro as Error).message}`);
      }
      return null;
    }
  }

  async salvar(snapshot: Snapshot): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.arquivo), { recursive: true });
      await fs.writeFile(this.arquivo, JSON.stringify(snapshot), 'utf8');
    } catch (erro) {
      this.logger.aviso(`não foi possível salvar o snapshot: ${(erro as Error).message}`);
    }
  }
}
