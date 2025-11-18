//Desenvolvido por Marcelo
import { Router } from 'express';
import multer from 'multer';
import { importarAlunosCsvController, exportarCsvController, importarAlunosJsonController } from './turmas.controller.ts';
import { authenticateToken } from '../usuario/authUsers.ts';

const turmasRoutes = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

turmasRoutes.post(
  '/:id/import',       
  authenticateToken,
  upload.single('file'), 
  importarAlunosCsvController  
);

// Importação via JSON (array de alunos)
turmasRoutes.post(
  '/:id/import-json',
  authenticateToken,
  importarAlunosJsonController
);

turmasRoutes.get(
  '/:id/csv',
  authenticateToken,
  exportarCsvController
);

export default turmasRoutes;
