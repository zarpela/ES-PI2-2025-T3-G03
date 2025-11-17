// Desenvolvido por Marcelo

import csvParser from 'csv-parser';                 // Biblioteca para ler CSV de forma stream
import { Readable } from 'stream';                 // Permite transformar Buffer em stream legível
import { validate } from 'class-validator';        // Validação automática com decorators
import { plainToInstance } from 'class-transformer'; // Converte objetos simples para classes DTO
import { AlunoImportCsvDto } from '../repository/dto/AlunoImportCsv.dto.ts'; // DTO dos alunos
import { Parser } from 'json2csv';                 // Biblioteca para transformar JSON → CSV
import { pool } from '../repository/bd.ts';        // Conexão com banco de dados MySQL

export class NotaService {

  /**
   * Exporta as notas de uma turma específica para uma string CSV.
   */
  async exportarNotas(turmaId: number): Promise<string> {
    // SQL com JOINs para buscar aluno, turma, componente e notas
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
      // Executa query SQL
      const [rows] = await pool.query(sql, [turmaId]);
      const dadosDoBanco = rows as any[];

      // Caso não existam notas, só avisa, gerando CSV só com cabeçalhos
      if (dadosDoBanco.length === 0) {
        console.warn(`Nenhuma nota encontrada para exportar da turma ${turmaId}`);
      }

      // Define colunas do CSV
      const fields = ['aluno_identificador', 'aluno_nome', 'componente_identificador', 'valor'];

      // Cria parser para converter JSON → CSV
      const parser = new Parser({ fields });
      const csvString = parser.parse(dadosDoBanco);

      return csvString;

    } catch (error) {
      console.error("Erro ao exportar notas:", error);
      throw new Error("Não foi possível gerar o CSV.");
    }
  }

  // Converte um buffer CSV em array de objetos
  private parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer);   // Converte Buffer em stream

      stream
        .pipe(csvParser())                    // Faz parsing linha a linha
        .on('data', (data: any) => results.push(data)) // Armazena cada linha convertida em objeto
        .on('end', () => resolve(results))             // Finaliza processamento
        .on('error', (error: Error) => reject(error)); // Trata erro
    });
  }

  /**
   * Importa e adiciona alunos de um arquivo CSV a uma turma específica.
   */
  async importarAlunosDoCsv(fileBuffer: Buffer, turmaId: number) {
    // Lê o CSV e converte para array de objetos
    const linhasDoCsv = await this.parseCsv(fileBuffer);

    // --- 1. VALIDAÇÃO DO CONTEÚDO COM DTO ---
    const dtos = plainToInstance(AlunoImportCsvDto, linhasDoCsv);
    const errosDeValidacao = [];
    const dtosValidos: AlunoImportCsvDto[] = [];

    // Validação linha por linha
    for (const [index, dto] of dtos.entries()) {
      const erros = await validate(dto);

      if (erros.length > 0) {
        // Armazena quais linhas deram erro e quais mensagens
        errosDeValidacao.push({
          linha: index + 2, // +2 para corresponder ao CSV real (linha 1 é cabeçalho)
          dados: dto,
          erros: erros.map(e => Object.values(e.constraints || {})).flat()
        });
      } else {
        dtosValidos.push(dto); // DTO válido
      }
    }

    // Se nada estiver válido → para a importação
    if (dtosValidos.length === 0) {
      return {
        sucesso: false,
        message: "Nenhum dado válido encontrado no CSV.",
        erros: errosDeValidacao
      };
    }

    // --- 2. VALIDAÇÃO DE LÓGICA DE NEGÓCIO ---
    const errosDeLogica = [];
    let alunosAdicionados = 0;

    try {
      // Processa cada aluno válido
      for (const [index, dto] of dtosValidos.entries()) {
        const linhaCsv = index + 2;

        try {
          // Verifica se aluno já existe no banco
          const [alunoRows] = await pool.query(
            'SELECT id FROM aluno WHERE identificador = ?',
            [dto.aluno_identificador]
          );
          const alunos = alunoRows as any[];

          let alunoId: number;

          if (alunos.length === 0) {
            // Aluno novo → insere
            const [insertResult] = await pool.query(
              'INSERT INTO aluno (identificador, nome) VALUES (?, ?)',
              [dto.aluno_identificador, dto.aluno_nome]
            );
            alunoId = (insertResult as any).insertId;
          } else {
            alunoId = alunos[0].id; // Reutiliza aluno existente
          }

          // Verifica se aluno já está na turma
          const [alunoTurmaRows] = await pool.query(
            'SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?',
            [alunoId, turmaId]
          );
          const alunosTurma = alunoTurmaRows as any[];

          if (alunosTurma.length === 0) {
            // Adiciona aluno à turma
            await pool.query(
              'INSERT INTO aluno_turma (aluno_id, turma_id) VALUES (?, ?)',
              [alunoId, turmaId]
            );
            alunosAdicionados++;
          } else {
            errosDeLogica.push(
              `Linha ${linhaCsv}: Aluno '${dto.aluno_identificador}' já está nesta turma.`
            );
          }

        } catch (error) {
          errosDeLogica.push(
            `Linha ${linhaCsv}: Erro ao processar aluno '${dto.aluno_identificador}' - ${(error as Error).message}`
          );
        }
      }

      return {
        sucesso: true,
        message: "Importação concluída.",
        adicionados: alunosAdicionados,
        errosDeValidacao: errosDeValidacao.length,
        errosDeLogica: errosDeLogica.length,
        detalhes: {
          errosDeValidacao,
          errosDeLogica
        }
      };

    } catch (error) {
      console.error("Erro na importação de alunos:", error);
      throw new Error("Não foi possível importar alunos.");
    }
  }

  /**
   * Importa alunos a partir de um array JSON.
   * Aceita estruturas diferentes e normaliza para o DTO esperado.
   */
  async importarAlunosDoJson(jsonArray: any[], turmaId: number) {
    if (!Array.isArray(jsonArray)) {
      return { sucesso: false, message: 'Formato inválido: esperado um array.' };
    }

    // Normaliza os objetos
    const normalizados = jsonArray.map((item) => {
      if (item == null || typeof item !== 'object') return {};

      if (item.aluno_identificador && item.aluno_nome) {
        return {
          aluno_identificador: String(item.aluno_identificador),
          aluno_nome: String(item.aluno_nome)
        };
      }

      if (item.identificador && item.nome) {
        return {
          aluno_identificador: String(item.identificador),
          aluno_nome: String(item.nome)
        };
      }

      return {}; // Caso inválido
    });

    // Validação via DTO
    const dtos = plainToInstance(AlunoImportCsvDto, normalizados);
    const errosDeValidacao: any[] = [];
    const dtosValidos: AlunoImportCsvDto[] = [];

    // Validação linha a linha
    for (const [index, dto] of dtos.entries()) {
      const erros = await validate(dto);

      if (erros.length > 0) {
        errosDeValidacao.push({
          linha: index + 1,
          dados: dto,
          erros: erros.map(e => Object.values(e.constraints || {})).flat()
        });
      } else {
        dtosValidos.push(dto);
      }
    }

    // Se nenhuma entrada for válida → parar
    if (dtosValidos.length === 0) {
      return {
        sucesso: false,
        message: 'Nenhum dado válido encontrado no JSON.',
        erros: errosDeValidacao
      };
    }

    const errosDeLogica: string[] = [];
    let alunosAdicionados = 0;

    try {
      // Processamento final de lógica
      for (const [index, dto] of dtosValidos.entries()) {
        const origemIndex = index + 1;

        try {
          // Verifica se aluno já existe
          const [alunoRows] = await pool.query(
            'SELECT id FROM aluno WHERE identificador = ?',
            [dto.aluno_identificador]
          );
          const alunos = alunoRows as any[];

          let alunoId: number;

          if (alunos.length === 0) {
            // Criar aluno
            const [insertResult] = await pool.query(
              'INSERT INTO aluno (identificador, nome) VALUES (?, ?)',
              [dto.aluno_identificador, dto.aluno_nome]
            );
            alunoId = (insertResult as any).insertId;
          } else {
            alunoId = alunos[0].id;
          }

          // Verifica vínculo com turma
          const [alunoTurmaRows] = await pool.query(
            'SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?',
            [alunoId, turmaId]
          );
          const alunosTurma = alunoTurmaRows as any[];

          if (alunosTurma.length === 0) {
            await pool.query(
              'INSERT INTO aluno_turma (aluno_id, turma_id) VALUES (?, ?)',
              [alunoId, turmaId]
            );
            alunosAdicionados++;
          } else {
            errosDeLogica.push(
              `Item ${origemIndex}: Aluno '${dto.aluno_identificador}' já está nesta turma.`
            );
          }

        } catch (error) {
          errosDeLogica.push(
            `Item ${origemIndex}: Erro ao processar aluno '${dto.aluno_identificador}' - ${(error as Error).message}`
          );
        }
      }

      return {
        sucesso: true,
        message: 'Importação concluída.',
        adicionados: alunosAdicionados,
        errosDeValidacao: errosDeValidacao.length,
        errosDeLogica: errosDeLogica.length,
        detalhes: { errosDeValidacao, errosDeLogica }
      };

    } catch (error) {
      console.error('Erro na importação de alunos (JSON):', error);
      throw new Error('Não foi possível importar alunos.');
    }
  }
}
