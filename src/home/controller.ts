import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDisciplinas, addDisciplina, updateDisciplina, deleteDisciplina } from '../bd/bd.ts';
import { pool } from '../bd/bd.ts';

const router = express.Router();

// Corrige __filename e __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);

// Rotas de páginas (usando EJS ou outro template)
router.get('/turmas', (req, res) => {
    res.render(path.join(__dirname, 'turmas.ejs'));
});

router.get('/instituicoes', (req, res) => {
    res.render(path.join(__dirname, 'instituicoes.ejs'));
});

router.get('/disciplinas', (req, res) => {
    res.render(path.join(__dirname, 'disciplinas.ejs'));
});

router.get('/api/instituicoes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM instituicao');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar instituições' });
  }
});

// API: Listar Disciplinas
router.get('/api/disciplinas', async (req, res) => {
    try {
    const [rows] = await pool.query('SELECT * FROM disciplina');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar disciplina' });
  }
});

// API: Adicionar disciplina
router.get('/api/disciplinas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM disciplina');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar disciplinas' });
  }
});

// API: Editar disciplina
router.put('/api/disciplinas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new Error("ID inválido");
    const data = req.body;
    await updateDisciplina(id, data);
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao editar disciplina.' });
  }
});

// API: Deletar disciplina
router.delete('/api/disciplinas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await deleteDisciplina(id);
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar disciplina.' });
    }
});

export default router;
