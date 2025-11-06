import express from 'express';
const router = express.Router();

import path from 'path';
import { getDisciplinas, addDisciplina, updateDisciplina, deleteDisciplina } from '../bd/bd.ts';
import type { Disciplina } from '../bd/bd.ts';


// Se necessário, ajuste __dirname para ESM/TS:
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

router.get('/turmas', (req, res) => {
    res.render(path.join(__dirname, 'turmas.ejs'));
});


router.get('/instituicoes', (req, res) => {
    res.render(path.join(__dirname, 'instituicoes.ejs'));
});
// Nova rota para disciplinas
// Página de disciplinas
router.get('/disciplinas', (req, res) => {
    res.render(path.join(__dirname, 'disciplinas.ejs'));
});

// API: Listar disciplinas
router.get('/api/disciplinas', async (req, res) => {
    try {
        const disciplinas = await getDisciplinas();
        res.json(disciplinas);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar disciplinas gfhrggt' });
    }
});

// API: Adicionar disciplina
router.post('/api/disciplinas', async (req, res) => {
    try {
        const data: Disciplina = req.body;
        const result = await addDisciplina(data);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao adicionar disciplina' });
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
        res.status(500).json({ error: 'Erro ao editar disciplina' });
    }
});

// API: Deletar disciplina
router.delete('/api/disciplinas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await deleteDisciplina(id);
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar disciplina' });
    }
});

export default router;