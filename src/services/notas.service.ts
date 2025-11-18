//Desenvolvido por Marcelo
import csvParser from 'csv-parser'; // Biblioteca usada para ler arquivos CSV
import { Readable } from 'stream'; // Permite transformar o buffer em stream legível
import { validate } from 'class-validator'; // Validação dos DTOs
import { plainToInstance } from 'class-transformer'; // Converte objetos comuns em instâncias de classes
import { AlunoImportCsvDto } from '../repository/dto/AlunoImportCsv.dto.ts'; // DTO para validação dos dados do CSV
import { Parser } from 'json2csv'; // Biblioteca usada para converter JSON para CSV
// Importa o pool de conexão do seu arquivo de banco de dados
import { pool } from '../repository/bd.ts'; 

export class NotaService {

  /**
   * Exporta as notas de uma turma específica para uma string CSV.
   */
  async exportarNotas(turmaId: number): Promise<string> {
    // 1. Query SQL com JOINs para "achatar" os dados da nota, aluno e componente
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
      // 2. Executa a query no banco
      const [rows] = await pool.query(sql, [turmaId]);
      const dadosDoBanco = rows as any[];

      if (dadosDoBanco.length === 0) {
        // Caso não haja dados, apenas informa no console
        console.warn(`Nenhuma nota encontrada para exportar da turma ${turmaId}`);
      }

      // 3. Define os campos (cabeçalhos) do CSV
      const fields = ['aluno_identificador', 'aluno_nome', 'componente_identificador', 'valor'];
      
      // 4. Cria um parser e converte os dados para CSV
      const parser = new Parser({ fields });
      const csvString = parser.parse(dadosDoBanco);

      return csvString;

    } catch (error) {
      // Caso ocorra alguma falha na exportação
      console.error("Erro ao exportar notas:", error);
      throw new Error("Não foi possível gerar o CSV.");
    }
  }


  private parseCsv(buffer: Buffer): Promise<any[]> {
    // Função que converte um buffer CSV para um array de objetos
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer); // Converte o buffer em stream
      stream
        .pipe(csvParser()) // Lê o CSV linha por linha
        .on('data', (data: any) => results.push(data)) // Empurra cada linha para o array
        .on('end', () => resolve(results)) // Finaliza
        .on('error', (error: Error) => reject(error)); // Caso ocorra erro
    });
  }

  /**
   * Importa e adiciona alunos de um arquivo CSV a uma turma específica.
   */
  async importarAlunosDoCsv(fileBuffer: Buffer, turmaId: number) {
    const linhasDoCsv = await this.parseCsv(fileBuffer); // Lê o CSV e transforma em objetos

    // --- 1. VALIDAÇÃO DE FORMATO (DTO) ---
    const dtos = plainToInstance(AlunoImportCsvDto, linhasDoCsv); // Converte os objetos em DTOs
    const errosDeValidacao = []; // Lista para armazenar erros de validação
    const dtosValidos: AlunoImportCsvDto[] = []; // DTOs validados e corretos

    for (const [index, dto] of dtos.entries()) {
      const erros = await validate(dto); // Valida campos obrigatórios
      if (erros.length > 0) {
        // Se houver erro, armazena informações sobre a linha do CSV
        errosDeValidacao.push({
          linha: index + 2, // +2 por causa do cabeçalho
          dados: dto,
          erros: erros.map(e => Object.values(e.constraints || {})).flat()
        });
      } else {
        dtosValidos.push(dto); // DTO válido
      }
    }

    if (dtosValidos.length === 0) {
      // Se nada for válido, retorna falha
      return { 
        sucesso: false, 
        message: "Nenhum dado válido encontrado no CSV.",
        erros: errosDeValidacao 
      };
    }

    // --- 2. VALIDAÇÃO DE LÓGICA E INSERÇÃO ---
    const errosDeLogica = []; // Erros como duplicidade de aluno e etc.
    let alunosAdicionados = 0; // Contador de inserções bem-sucedidas

    try {
      for (const [index, dto] of dtosValidos.entries()) {
        const linhaCsv = index + 2;

        try {
          // Verifica se o aluno já existe no banco
          const [alunoRows] = await pool.query(
            'SELECT id FROM aluno WHERE identificador = ?',
            [dto.aluno_identificador]
          );
          const alunos = alunoRows as any[];

          let alunoId: number;

          if (alunos.length === 0) {
            // Se o aluno não existe, insere no banco
            const [insertResult] = await pool.query(
              'INSERT INTO aluno (identificador, nome) VALUES (?, ?)',
              [dto.aluno_identificador, dto.aluno_nome]
            );
            const result = insertResult as any;
            alunoId = result.insertId;
          } else {
            // Senão, reutiliza o ID existente
            alunoId = alunos[0].id;
          }

          // Verifica se o aluno já está na turma
          const [alunoTurmaRows] = await pool.query(
            'SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?',
            [alunoId, turmaId]
          );
          const alunosTurma = alunoTurmaRows as any[];

          if (alunosTurma.length === 0) {
            // Se não está, adiciona
            await pool.query(
              'INSERT INTO aluno_turma (aluno_id, turma_id) VALUES (?, ?)',
              [alunoId, turmaId]
            );
            alunosAdicionados++;
          } else {
            // Caso já esteja, registra erro de lógica
            errosDeLogica.push(`Linha ${linhaCsv}: Aluno '${dto.aluno_identificador}' já está nesta turma.`);
          }

        } catch (error) {
          // Caso haja qualquer erro ao processar a linha
          errosDeLogica.push(`Linha ${linhaCsv}: Erro ao processar aluno '${dto.aluno_identificador}' - ${(error as Error).message}`);
        }
      }

      // Retorna resumo da importação
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
   * Importa e adiciona alunos a uma turma a partir de um array JSON.
   * Aceita objetos com chaves { aluno_identificador, aluno_nome } ou { identificador, nome }.
   */
  async importarAlunosDoJson(jsonArray: any[], turmaId: number) {
    if (!Array.isArray(jsonArray)) {
      // Valida que o parâmetro recebido é realmente um array
      return { sucesso: false, message: 'Formato inválido: esperado um array.' };
    }

    // Normaliza entradas para o formato do DTO
    const normalizados = jsonArray.map((item) => {
      if (item == null || typeof item !== 'object') return {};
      if (item.aluno_identificador && item.aluno_nome) {
        return { aluno_identificador: String(item.aluno_identificador), aluno_nome: String(item.aluno_nome) };
      }
      if (item.identificador && item.nome) {
        return { aluno_identificador: String(item.identificador), aluno_nome: String(item.nome) };
      }
      return {};
    });

    // Mesma validação usada no CSV
    const dtos = plainToInstance(AlunoImportCsvDto, normalizados);
    const errosDeValidacao: any[] = [];
    const dtosValidos: AlunoImportCsvDto[] = [];

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

    if (dtosValidos.length === 0) {
      // Nenhum item válido
      return {
        sucesso: false,
        message: 'Nenhum dado válido encontrado no JSON.',
        erros: errosDeValidacao
      };
    }

    const errosDeLogica: string[] = [];
    let alunosAdicionados = 0;

    try {
      for (const [index, dto] of dtosValidos.entries()) {
        const origemIndex = index + 1;
        try {
          // Verifica se o aluno já existe
          const [alunoRows] = await pool.query(
            'SELECT id FROM aluno WHERE identificador = ?',
            [dto.aluno_identificador]
          );
          const alunos = alunoRows as any[];

          let alunoId: number;
          if (alunos.length === 0) {
            // Se não existe, insere
            const [insertResult] = await pool.query(
              'INSERT INTO aluno (identificador, nome) VALUES (?, ?)',
              [dto.aluno_identificador, dto.aluno_nome]
            );
            alunoId = (insertResult as any).insertId;
          } else {
            alunoId = alunos[0].id;
          }

          // Verifica se já está na turma
          const [alunoTurmaRows] = await pool.query(
            'SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?',
            [alunoId, turmaId]
          );
          const alunosTurma = alunoTurmaRows as any[];

          if (alunosTurma.length === 0) {
            // Insere se não estiver
            await pool.query(
              'INSERT INTO aluno_turma (aluno_id, turma_id) VALUES (?, ?)',
              [alunoId, turmaId]
            );
            alunosAdicionados++;
          } else {
            errosDeLogica.push(`Item ${origemIndex}: Aluno '${dto.aluno_identificador}' já está nesta turma.`);
          }
        } catch (error) {
          // Caso ocorra erro ao inserir um item
          errosDeLogica.push(`Item ${origemIndex}: Erro ao processar aluno '${dto.aluno_identificador}' - ${(error as Error).message}`);
        }
      }

      // Resumo da importação
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
