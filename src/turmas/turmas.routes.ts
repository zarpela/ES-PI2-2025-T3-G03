import { Router } from 'express';
import multer from 'multer';
import { importarAlunosCsvController, exportarCsvController, importarAlunosJsonController } from './turmas.controller.ts';
import { authenticateToken } from '../usuario/authUsers.ts';

// Cria um roteador específico para rotas relacionadas às turmas
const turmasRoutes = Router();

// Configuração do Multer para armazenar arquivos em memória (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Rota para importar alunos via arquivo CSV
// :id -> ID da turma
// authenticateToken -> garante que apenas usuários autenticados possam importar
// upload.single('file') -> recebe um arquivo enviado no campo "file"
// importarAlunosCsvController -> função que processa o CSV
turmasRoutes.post(
  '/:id/import',
  authenticateToken,
  upload.single('file'),
  importarAlunosCsvController
);

// Rota para importar alunos via JSON
// Aqui não há upload de arquivo, os dados devem vir no corpo da requisição
// authenticateToken -> apenas usuários autenticados
// importarAlunosJsonController -> trata os dados e faz a inserção
 turmasRoutes.post(
  '/:id/import-json',
  authenticateToken,
  importarAlunosJsonController
);

// Rota para exportar os alunos de uma turma em formato CSV
// authenticateToken -> apenas usuários autenticados
// exportarCsvController -> gera e envia o CSV
 turmasRoutes.get(
  '/:id/csv',
  authenticateToken,
  exportarCsvController
);

// Exporta as rotas para uso no servidor principal
export default turmasRoutes;