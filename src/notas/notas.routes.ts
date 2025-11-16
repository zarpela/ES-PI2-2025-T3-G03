//Desenvolvido por Marcelo Zarpelon
import { Router } from 'express';
import multer from 'multer';
import { importarAlunosCsvController, exportarCsvController } from './notas.controller.ts';

const notaRoutes = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

notaRoutes.post(
  '/turma/:turmaId/importar-alunos-csv',       
  upload.single('file'), 
  importarAlunosCsvController  
);

notaRoutes.get(
  '/turma/:turmaId/exportar-csv',
  exportarCsvController
);

export default notaRoutes;