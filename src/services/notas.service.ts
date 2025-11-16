//Desenvolvido por Marcelo
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotaImportCsvDto } from '../repository/dto/NotaImportCsv.dto.ts';
import { Parser } from 'json2csv';
// Importa o pool de conexão do seu arquivo de banco de dados
import { pool } from '../repository/bd.ts'; 

export class NotaService {

  /**
   * Importa e salva as notas de um arquivo CSV para uma turma específica.
   */
  async importarNotasDoCsv(fileBuffer: Buffer, turmaId: number) {
    const linhasDoCsv = await this.parseCsv(fileBuffer);

    // --- 1. VALIDAÇÃO DE FORMATO (DTO) ---
    const dtos = plainToInstance(NotaImportCsvDto, linhasDoCsv);
    const errosDeValidacao = [];
    const dtosValidos: NotaImportCsvDto[] = [];

    for (const [index, dto] of dtos.entries()) {
      const erros = await validate(dto);
      if (erros.length > 0) {
        errosDeValidacao.push({
          linha: index + 2, // +1 (índice 0) e +1 (cabeçalho)
          dados: dto,
          // Transforma a lista de erros em um array simples de strings
          erros: erros.map(e => Object.values(e.constraints || {})).flat()
        });
      } else {
        dtosValidos.push(dto);
      }
    }

    if (dtosValidos.length === 0) {
      return { 
        sucesso: false, 
        message: "Nenhum dado válido encontrado no CSV.",
        erros: errosDeValidacao 
      };
    }

    // --- 2. VALIDAÇÃO DE LÓGICA (BANCO DE DADOS) ---
    const errosDeLogica = [];
    const notasParaUpsert = [];

    try {
      // Otimização: Pegar todos os identificadores únicos do CSV
      const alunoIdentificadores = [...new Set(dtosValidos.map(dto => dto.aluno_identificador))];
      const componenteIdentificadores = [...new Set(dtosValidos.map(dto => dto.componente_identificador))];

      // Otimização: Buscar todos os dados do Banco de uma vez
      const [alunosRows] = await pool.query(
        'SELECT id, identificador FROM aluno WHERE identificador IN (?)',
        [alunoIdentificadores]
      );
      const [componentesRows] = await pool.query(
        'SELECT id, identificador FROM componente_nota WHERE identificador IN (?)',
        [componenteIdentificadores]
      );
      const [alunosDaTurmaRows] = await pool.query(
        `SELECT at.id, at.aluno_id 
         FROM aluno_turma AS at
         JOIN aluno AS a ON at.aluno_id = a.id
         WHERE at.turma_id = ? AND a.identificador IN (?)`,
        [turmaId, alunoIdentificadores]
      );

      // Converte resultados para arrays
      const alunos = alunosRows as any[];
      const componentes = componentesRows as any[];
      const alunosDaTurma = alunosDaTurmaRows as any[];

      // --- 3. MAPEAMENTO (Para performance) ---
      const alunoMap = new Map(alunos.map(a => [a.identificador, a]));
      const componenteMap = new Map(componentes.map(c => [c.identificador, c]));
      const alunoTurmaMap = new Map(alunosDaTurma.map(at => [at.aluno_id, at])); // Mapeia aluno_id -> aluno_turma

      // --- 4. PROCESSAR CADA DTO VÁLIDO ---
      for (const [index, dto] of dtosValidos.entries()) {
        const linhaCsv = index + 2;
        const aluno = alunoMap.get(dto.aluno_identificador);
        const componente = componenteMap.get(dto.componente_identificador);

        if (!aluno) {
          errosDeLogica.push(`Linha ${linhaCsv}: Aluno com identificador '${dto.aluno_identificador}' não foi encontrado.`);
          continue;
        }
        if (!componente) {
          errosDeLogica.push(`Linha ${linhaCsv}: Componente '${dto.componente_identificador}' não foi encontrado.`);
          continue;
        }

        const alunoTurma = alunoTurmaMap.get(aluno.id);

        if (!alunoTurma) {
          errosDeLogica.push(`Linha ${linhaCsv}: Aluno '${dto.aluno_identificador}' não está matriculado nesta turma (ID: ${turmaId}).`);
          continue;
        }

        // Sucesso! Temos todos os IDs
        notasParaUpsert.push([
          alunoTurma.id,   // aluno_turma_id
          componente.id,   // componente_id
          dto.valor          // valor
        ]);
      }

      // --- 5. SALVAR NO BANCO (com SQL "Upsert") ---
      if (notasParaUpsert.length > 0) {
        // Preparamos um "INSERT ... ON DUPLICATE KEY UPDATE"
        // Isso usa a sua UNIQUE constraint(aluno_turma_id, componente_id)
        // para ATUALIZAR a nota se ela já existir.
        
        const sqlUpsert = `
          INSERT INTO nota (aluno_turma_id, componente_id, valor) 
          VALUES ? 
          ON DUPLICATE KEY UPDATE valor = VALUES(valor);
        `;
        
        // Executa a query de "UPSERT" em lote
        await pool.query(sqlUpsert, [notasParaUpsert]);
      }
      
    } catch (dbError) {
      console.error(dbError);
      return { sucesso: false, message: "Erro ao salvar dados no banco." };
    }

    // --- 6. RETORNAR RELATÓRIO FINAL ---
    return {
      sucesso: true,
      message: "Importação concluída.",
      salvos: notasParaUpsert.length,
      errosDeValidacao: errosDeValidacao.length,
      errosDeLogica: errosDeLogica.length,
      detalhes: {
        errosDeValidacao,
        errosDeLogica // Lista de erros de lógica
      }
    };
  }

  /**
   * Exporta as notas de uma turma específica para uma string CSV.
   */
  async exportarNotas(turmaId: number): Promise<string> {
    // 1. Query SQL com JOINs para "achatar" os dados
    const sql = `
      SELECT
          a.identificador AS aluno_identificador,
          a.nome AS aluno_nome,
          cn.sigla AS componente_identificador,
          n.valor
      FROM nota AS n
      JOIN aluno_turma AS at ON n.aluno_turma_id = at.id
      JOIN aluno AS a ON at.aluno_id = a.id
      JOIN componente_nota AS cn ON n.componente_id = cn.id
      WHERE at.turma_id = ?
      ORDER BY a.nome, cn.sigla;
    `;

    try {
      // 2. Executar a query
      const [rows] = await pool.query(sql, [turmaId]);
      const dadosDoBanco = rows as any[];

      if (dadosDoBanco.length === 0) {
        // Retorna um CSV vazio, mas válido (apenas com cabeçalhos)
        console.warn(`Nenhuma nota encontrada para exportar da turma ${turmaId}`);
      }

      // 3. Definir os cabeçalhos do CSV
      // (O `json2csv` usa os nomes dos campos da query)
      const fields = ['aluno_identificador', 'aluno_nome', 'componente_identificador', 'valor'];
      
      // 4. Criar o parser e converter para CSV
      const parser = new Parser({ fields });
      const csvString = parser.parse(dadosDoBanco);

      return csvString;

    } catch (error) {
      console.error("Erro ao exportar notas:", error);
      throw new Error("Não foi possível gerar o CSV.");
    }
  }


  private parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }
}