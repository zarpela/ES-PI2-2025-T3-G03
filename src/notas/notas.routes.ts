//Desenvolvido por Marcelo
import { Router } from 'express';
import multer from 'multer';
import { importarCsvController, exportarCsvController } from './notas.controller.ts'; // Ou onde seu controller estiver

const notaRoutes = Router();

// Configura o Multer para usar a memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define a rota de importação
// 'file' é o nome do campo que o front-end enviará
notaRoutes.post(
  '/importar-csv',       
  upload.single('file'), 
  importarCsvController  
);

notaRoutes.get(
  '/turma/:turmaId/exportar-csv',
  exportarCsvController
);

export default notaRoutes;