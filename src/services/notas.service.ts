//Desenvolvido por Marcelo
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AlunoImportCsvDto } from '../repository/dto/AlunoImportCsv.dto.ts';
import { Parser } from 'json2csv';
// Importa o pool de conexão do seu arquivo de banco de dados
import { pool } from '../repository/bd.ts'; 

export class NotaService {

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

  /**
   * Importa e adiciona alunos de um arquivo CSV a uma turma específica.
   */
  async importarAlunosDoCsv(fileBuffer: Buffer, turmaId: number) {
    const linhasDoCsv = await this.parseCsv(fileBuffer);

    // --- 1. VALIDAÇÃO DE FORMATO (DTO) ---
    const dtos = plainToInstance(AlunoImportCsvDto, linhasDoCsv);
    const errosDeValidacao = [];
    const dtosValidos: AlunoImportCsvDto[] = [];

    for (const [index, dto] of dtos.entries()) {
      const erros = await validate(dto);
      if (erros.length > 0) {
        errosDeValidacao.push({
          linha: index + 2, // +1 (índice 0) e +1 (cabeçalho)
          dados: dto,
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

    // --- 2. VALIDAÇÃO DE LÓGICA E INSERÇÃO ---
    const errosDeLogica = [];
    let alunosAdicionados = 0;

    try {
      for (const [index, dto] of dtosValidos.entries()) {
        const linhaCsv = index + 2;

        try {
          // Verifica se o aluno já existe
          const [alunoRows] = await pool.query(
            'SELECT id FROM aluno WHERE identificador = ?',
            [dto.aluno_identificador]
          );
          const alunos = alunoRows as any[];

          let alunoId: number;

          if (alunos.length === 0) {
            // Aluno não existe, criar novo
            const [insertResult] = await pool.query(
              'INSERT INTO aluno (identificador, nome) VALUES (?, ?)',
              [dto.aluno_identificador, dto.aluno_nome]
            );
            const result = insertResult as any;
            alunoId = result.insertId;
          } else {
            // Aluno já existe, usar seu ID
            alunoId = alunos[0].id;
          }

          // Verifica se o aluno já está na turma
          const [alunoTurmaRows] = await pool.query(
            'SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?',
            [alunoId, turmaId]
          );
          const alunosTurma = alunoTurmaRows as any[];

          if (alunosTurma.length === 0) {
            // Adicionar aluno à turma
            await pool.query(
              'INSERT INTO aluno_turma (aluno_id, turma_id) VALUES (?, ?)',
              [alunoId, turmaId]
            );
            alunosAdicionados++;
          } else {
            errosDeLogica.push(`Linha ${linhaCsv}: Aluno '${dto.aluno_identificador}' já está nesta turma.`);
          }

        } catch (error) {
          errosDeLogica.push(`Linha ${linhaCsv}: Erro ao processar aluno '${dto.aluno_identificador}' - ${(error as Error).message}`);
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
}