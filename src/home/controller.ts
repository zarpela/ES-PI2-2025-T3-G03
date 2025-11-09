import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDisciplinas, addDisciplina, updateDisciplina, deleteDisciplina } from '../bd/bd.ts';
import type { Disciplina } from '../bd/bd.ts';

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

// API: Listar Disciplinas
router.get('/api/disciplinas', async (req, res) => {
    try {
        const disciplinas = await getDisciplinas();
        res.json(disciplinas);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar disciplinas.' });
    }
});

// API: Adicionar disciplina
router.post('/api/disciplinas', async (req, res) => {
    try {
        const data: Disciplina = req.body;
        const result = await addDisciplina(data);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao adicionar disciplina.' });
    }
});

// API: Editar disciplina
router.put('/api/disciplinas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data: Disciplina = req.body;
        await updateDisciplina(id, data);
        res.json({ id });
    } catch (err) {
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
