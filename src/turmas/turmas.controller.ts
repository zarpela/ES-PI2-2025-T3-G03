//Desenvolvido por Marcelo

import { type Request, type Response } from 'express';  // Tipos do Express
import { NotaService } from '../services/notas.service.ts'; // Importa o serviço de notas

// Instanciamos o serviço manualmente
const notaService = new NotaService(); // Serviço responsável pela lógica de CSV/JSON

export const importarAlunosCsvController = async (req: Request, res: Response) => {
  try {
    // 1. O 'multer' coloca o arquivo no 'req.file'
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    // 2. Pegamos o buffer do arquivo enviado
    const buffer = req.file.buffer;

    // Pega ID da turma da URL
    const turmaIdParam = req.params.id;
    if (!turmaIdParam) {
      return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }

    // Converte ID para número
    const turmaId = parseInt(turmaIdParam, 10);
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID da turma inválido.' });
    }

    // 3. Chama o serviço para importar via CSV
    const resultado = await notaService.importarAlunosDoCsv(buffer, turmaId);

    // 4. Retorna o resultado da operação (inseridos, erros, etc.)
    return res.status(200).json(resultado);

  } catch (error) {
    console.error(error); // Loga o erro no servidor
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

export const exportarCsvController = async (req: Request, res: Response) => {
  try {
    const turmaIdParam = req.params.id;

    // Verifica se veio o ID
    if (!turmaIdParam) {
      return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }

    // Converte para número
    const turmaId = parseInt(turmaIdParam, 10);
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID de turma inválido.' });
    }

    // 1. Chama o serviço para gerar o CSV em string
    const csvString = await notaService.exportarNotas(turmaId);

    // 2. Define headers da resposta para baixar arquivo CSV
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="notas_turma_${turmaId}.csv"`);

    // 3. Envia o CSV
    res.send(csvString);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao gerar o arquivo CSV.' });
  }
};

export const importarAlunosJsonController = async (req: Request, res: Response) => {
  try {
    const turmaIdParam = req.params.id;

    // Verifica parâmetro
    if (!turmaIdParam) {
      return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }

    const turmaId = parseInt(turmaIdParam, 10);
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID da turma inválido.' });
    }

    // Body da requisição (espera array)
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: 'O corpo da requisição deve ser um array de alunos.' });
    }

    // Chama o serviço para importação
    const resultado = await notaService.importarAlunosDoJson(payload, turmaId);

    // Retorna o resultado
    return res.status(200).json(resultado);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};