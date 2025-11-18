//Desenvolvido por Marcelo

// Importa tipos do Express para tipagem de Request e Response
import { type Request, type Response } from 'express';
// Importa o serviço responsável pela lógica de notas
import { NotaService } from '../services/notas.service.ts';

// Instancia manualmente o serviço de notas
const notaService = new NotaService();

// Controller para importar alunos via CSV
export const importarAlunosCsvController = async (req: Request, res: Response) => {
  try {
    // 1. O Multer insere o arquivo enviado em req.file
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    // 2. Obtém o buffer do arquivo CSV
    const buffer = req.file.buffer;
    const turmaIdParam = req.params.id;

    // Valida se o ID da turma foi enviado
    if (!turmaIdParam) {
      return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }
    
    const turmaId = parseInt(turmaIdParam, 10);

    // Valida se o ID é numérico
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID da turma inválido.' });
    }

    // 3. Chama o serviço para importar alunos com base no CSV recebido
    const resultado = await notaService.importarAlunosDoCsv(buffer, turmaId);

    // 4. Retorna o resultado para o cliente
    return res.status(200).json(resultado);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

// Controller para exportar notas em formato CSV
export const exportarCsvController = async (req: Request, res: Response) => {
  try {
    const turmaIdParam = req.params.id;

    // Verifica se o ID foi informado
    if(!turmaIdParam){
        return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }

    const turmaId = parseInt(turmaIdParam, 10);

    // Valida ID numérico
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID de turma inválido.' });
    }

    // 1. Solicita ao serviço a geração da string CSV
    const csvString = await notaService.exportarNotas(turmaId);

    // 2. Define headers para forçar download do arquivo CSV
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="notas_turma_${turmaId}.csv"`);

    // 3. Envia o CSV como resposta para o cliente
    res.send(csvString);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao gerar o arquivo CSV.' });
  }
};

// Controller para importar alunos via JSON
export const importarAlunosJsonController = async (req: Request, res: Response) => {
  try {
    const turmaIdParam = req.params.id;

    // Verifica se ID da turma foi informado
    if (!turmaIdParam) {
      return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }

    const turmaId = parseInt(turmaIdParam, 10);

    // Valida ID numérico
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID da turma inválido.' });
    }

    // O corpo da requisição deve ser um array de alunos
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: 'O corpo da requisição deve ser um array de alunos.' });
    }

    // Chama o serviço para importar os alunos via JSON
    const resultado = await notaService.importarAlunosDoJson(payload, turmaId);
    return res.status(200).json(resultado);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};
