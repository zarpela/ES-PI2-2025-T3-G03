import { Router } from 'express';
import multer from 'multer';
import { importarAlunosCsvController, exportarCsvController } from './turmas.controller.ts';
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

turmasRoutes.get(
  '/:id/csv',
  authenticateToken,
  exportarCsvController
);

export default turmasRoutes;
