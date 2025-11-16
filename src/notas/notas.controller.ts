//Desenvolvido por Marcelo
import { type Request, type Response } from 'express';
import { NotaService } from '../services/notas.service.ts';

// Instanciamos o serviço manualmente
const notaService = new NotaService();

export const importarAlunosCsvController = async (req: Request, res: Response) => {
  try {
    // 1. O 'multer' coloca o arquivo no 'req.file'
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    // 2. Pegamos o buffer do arquivo
    const buffer = req.file.buffer;
    const turmaIdParam = req.params.turmaId;
    if (!turmaIdParam) {
      return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }
    
    const turmaId = parseInt(turmaIdParam, 10);
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID da turma inválido.' });
    }

    // 3. Chamamos o serviço com o buffer
    const resultado = await notaService.importarAlunosDoCsv(buffer, turmaId);

    // 4. Retornamos o resultado
    return res.status(200).json(resultado);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

export const exportarCsvController = async (req: Request, res: Response) => {
  try {
    const turmaIdParam = req.params.turmaId;
    if(!turmaIdParam){
        return res.status(400).json({ message: 'ID da turma é obrigatório.' });
    }
    const turmaId = parseInt(turmaIdParam, 10);
    if (isNaN(turmaId)) {
      return res.status(400).json({ message: 'ID de turma inválido.' });
    }

    // 1. Chama o serviço para gerar a string CSV
    const csvString = await notaService.exportarNotas(turmaId);

    // 2. Define os Headers para forçar o download
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="notas_turma_${turmaId}.csv"`);

    // 3. Envia a string CSV como resposta
    res.send(csvString);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao gerar o arquivo CSV.' });
  }
};