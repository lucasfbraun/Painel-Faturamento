/**
 * Composição da aplicação (composition root).
 *
 * É o único lugar que conhece todas as peças: aqui as dependências são criadas
 * e ligadas umas às outras. Todo o resto do código recebe o que precisa por
 * construtor, o que mantém os módulos testáveis isoladamente.
 */
import { Agendador } from './aplicacao/agendador.js';
import { ArmazenamentoSnapshot } from './aplicacao/armazenamentoSnapshot.js';
import { ColetorDePedidos } from './aplicacao/coletorDePedidos.js';
import { carregarConfig } from './config/ambiente.js';
import { ClienteHttpErp } from './erp/clienteHttp.js';
import { RepositorioPedidosErp } from './erp/repositorioPedidos.js';
import { ServidorDeArquivos } from './http/arquivosEstaticos.js';
import { criarServidor } from './http/servidor.js';
import { criarLogger } from './shared/logger.js';

async function principal(): Promise<void> {
  const config = carregarConfig();
  const logger = criarLogger();

  const cliente = new ClienteHttpErp({
    empresa: config.erp.empresa,
    token: config.erp.token,
    tlsInseguro: config.erp.tlsInseguro,
    timeoutMs: config.erp.timeoutMs,
  });

  const repositorio = new RepositorioPedidosErp(cliente, {
    baseUrl: config.erp.baseUrl,
    caminho: config.erp.caminho,
    paginacao: config.erp.paginacao,
    maxPaginas: config.erp.maxPaginas,
  });

  const coletor = new ColetorDePedidos(
    repositorio,
    {
      titulo: config.identificacao.titulo,
      subtitulo: config.identificacao.subtitulo,
      empresa: config.erp.empresa,
      diasRetroativos: config.coleta.diasRetroativos,
      intervaloMin: config.coleta.intervaloMin,
      intervaloAnoMin: config.coleta.intervaloAnoMin,
      fusoHorario: config.coleta.fusoHorario,
      diasDaSerie: config.coleta.diasDaSerie,
      regras: config.regras,
    },
    logger.comContexto('coletor'),
  );

  const armazenamento = new ArmazenamentoSnapshot(config.arquivoSnapshot, logger.comContexto('snapshot'));
  const salvo = await armazenamento.carregar();
  if (salvo) {
    coletor.restaurar(salvo);
    logger.info('snapshot anterior carregado do disco');
  }

  const servidor = criarServidor(
    { coletor, arquivos: new ServidorDeArquivos(config.caminhoWeb) },
    logger.comContexto('http'),
    config.embutirPermitido,
  );
  await servidor.ouvir(config.porta, config.endereco);

  logger.info(`painel disponível em http://localhost:${config.porta} (escutando em ${config.endereco})`);
  logger.info(
    `ERP ${config.erp.baseUrl}${config.erp.caminho} | empresa ${config.erp.empresa} | ` +
      `janela ${config.coleta.diasRetroativos} dias | ciclo ${config.coleta.intervaloMin} min`,
  );
  logger.info(
    config.embutirPermitido === '*'
      ? 'exibição em iframe liberada (software de TV) — ajuste PERMITIR_EMBUTIR para restringir'
      : `exibição em iframe: ${config.embutirPermitido}`,
  );
  if (!config.erp.token) logger.aviso('ERP_TOKEN está vazio — configure no .env, senão o ERP responde 401');

  const agendador = new Agendador(
    async () => {
      await coletor.executarCiclo();
      await armazenamento.salvar(coletor.snapshot);
    },
    config.coleta.intervaloMin,
    logger.comContexto('agendador'),
  );
  agendador.iniciar();

  const encerrar = (sinal: string) => {
    logger.info(`recebido ${sinal}, encerrando`);
    agendador.parar();
    void servidor.encerrar().then(() => process.exit(0));
  };
  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

principal().catch((erro: Error) => {
  console.error('Falha fatal ao iniciar o painel:', erro);
  process.exit(1);
});
