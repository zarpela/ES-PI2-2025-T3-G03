//Desenvolvido por Rafael Henrique dos Santos Inácio
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDisciplinas, addDisciplina, updateDisciplina, deleteDisciplina } from "../bd/bd.ts";
import { pool } from "../bd/bd.ts";
import { authenticateToken } from "../usuario/authUsers.ts";
import type { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = "segredo_super_secreto"; // coloque em variável de ambiente (.env);

// Tipagem do req.user para TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        nome?: string;
        email: string;
      };
    }
  }
}

router.get('/api/usuario', authenticateToken, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Usuário não autenticado' });
  res.json({ nome: req.user.nome });
});

// ROTAS DE PÁGINAS
router.get('/instituicoes', (req, res) => {
  res.render(path.join(__dirname, 'instituicoes.ejs'));
});

router.get('/disciplinas', (req, res) => {
  res.render(path.join(__dirname, 'disciplinas.ejs'));
});

router.get('/turmas', (req, res) => {
  res.render(path.join(__dirname, 'turmas.ejs'));
});

router.get('/cursos', (req, res) => {
  res.render(path.join(__dirname, 'cursos.ejs'));
});

// DISCIPLINAS COM USUÁRIO
router.get('/api/disciplinas', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, c.nome AS curso_nome
      FROM disciplina d
      LEFT JOIN curso c ON d.curso_id = c.id
      WHERE d.usuario_id = ?
    `, [req.user?.id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar disciplinas" });
  }
});

router.post('/api/disciplinas', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    data.usuario_id = req.user?.id;
    const result = await addDisciplina(data);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar disciplina" });
  }
});

router.put('/api/disciplinas/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new Error('ID inválido');
    const [rows] = await pool.query('SELECT usuario_id FROM disciplina WHERE id = ?', [id]);
    const disciplina = (rows as any[])[0];
    if (!disciplina) return res.status(404).json({ error: 'Disciplina não encontrada' });
    if (disciplina.usuario_id !== req.user?.id) return res.status(403).json({ error: 'Sem permissão para editar esta disciplina.' });
    const data = req.body;
    await updateDisciplina(id, data);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar disciplina.' });
  }
});

router.delete('/api/disciplinas/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT usuario_id FROM disciplina WHERE id = ?', [id]);
    const disciplina = (rows as any[])[0];
    if (!disciplina) return res.status(404).json({ error: 'Disciplina não encontrada' });
    if (disciplina.usuario_id !== req.user?.id) return res.status(403).json({ error: 'Sem permissão para deletar esta disciplina.' });
    await deleteDisciplina(id);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar disciplina.' });
  }
});

// INSTITUICOES (dados globais - sem autenticação obrigatória para leitura)
router.get('/api/instituicoes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const [rows] = await pool.query('SELECT * FROM instituicao WHERE usuario_id = ?', [userId]);
    res.json(rows);
  } catch (err) {
    console.error('Erro no get instituicoes:', err);
    res.status(500).json({ error: 'Erro ao buscar instituições' });
  }
});


// Rota para mostrar página da instituição específica
router.get('/instituicoes/:id', authenticateToken, async (req, res) => {
  const instituicaoId = req.params.id;
  const userId = req.user?.id;

  try {
    // Busca instituição do usuário
    const [instituicaoRows] = await pool.query(
      'SELECT * FROM instituicao WHERE id = ? AND usuario_id = ?', 
      [instituicaoId, userId]
    );
    const instituicao = (instituicaoRows as any[])[0];
    if (!instituicao) return res.status(404).send('Instituição não encontrada');

    // Busca cursos da instituição que pertencem ao usuário
    const [cursoRows] = await pool.query(`
      SELECT c.* FROM curso c
      JOIN instituicao i ON i.id = c.instituicao_id
      WHERE c.instituicao_id = ? AND i.usuario_id = ?
    `, [instituicaoId, userId]);

    res.render('instituicao', { instituicao, cursos: cursoRows });
  } catch (err) {
    res.status(500).send('Erro ao buscar instituição ou cursos');
  }
});


router.post('/api/instituicoes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const data = req.body;
    const [result] = await pool.query('INSERT INTO instituicao (nome, usuario_id) VALUES (?, ?)', [data.nome, userId]);
    const insertId = (result as any).insertId;
    res.status(201).json({ id: insertId, nome: data.nome });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar instituição' });
  }
});

// Rota API para buscar instituição específica com cursos
router.get('/api/instituicoes/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  const userId = req.user?.id;

  try {
    // Busca instituição do usuário
    const [instituicaoRows] = await pool.query(
      'SELECT * FROM instituicao WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );
    
    if (!instituicaoRows || (instituicaoRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    const instituicao = (instituicaoRows as any[])[0];

    // Busca cursos da instituição
    const [cursoRows] = await pool.query(`
      SELECT c.* FROM curso c
      JOIN instituicao i ON i.id = c.instituicao_id
      WHERE c.instituicao_id = ? AND i.usuario_id = ?
    `, [id, userId]);

    res.json({ instituicao, cursos: cursoRows || [] });
  } catch (err) {
    console.error('Erro ao buscar instituição:', err);
    res.status(500).json({ error: 'Erro ao buscar instituição ou cursos' });
  }
});


router.put('/api/instituicoes/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    await pool.query('UPDATE instituicao SET nome = ? WHERE id = ?', [data.nome, id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar instituição.' });
  }
});

router.delete('/api/instituicoes/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM instituicao WHERE id = ?', [id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar instituição.' });
  }
});

// CURSOS - vinculados com instituição

router.get('/cursos/:id', async (req, res) => {
  const instituicaoId = req.params.id;
  const token = req.query.token as string;

  console.log('=== INICIANDO ROTA /cursos/:id ===');
  console.log('instituicaoId:', instituicaoId);
  console.log('token recebido:', token ? 'SIM' : 'NÃO');

  if (!token) {
    console.log('Erro: Token não fornecido');
    return res.status(401).send('Token não fornecido. Acesso negado.');
  }

  let userId: number;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    userId = decoded.id;
  } catch (err) {
    return res.status(403).send('Token inválido ou expirado. Acesso negado.');
  }

  try {
    console.log('Buscando instituição:', instituicaoId, 'usuario_id:', userId);
    const [institutionRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM instituicao WHERE id = ? AND usuario_id = ?',
      [instituicaoId, userId]
    );

    if (institutionRows.length === 0) {
      return res.status(403).send('Você não tem permissão para acessar esta instituição.');
    }

    const instituicao = institutionRows[0];

    const [cursoRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.* FROM curso c
       JOIN instituicao i ON i.id = c.instituicao_id
       WHERE c.instituicao_id = ? AND i.usuario_id = ?`,
      [instituicaoId, userId]
    );

    res.render('cursos', { instituicao, cursos: cursoRows || [] });
  } catch (err) {
    res.status(500).send('Erro ao buscar cursos da instituição');
  }
});


router.get('/api/cursos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, i.nome AS instituicao_nome
      FROM curso c
      LEFT JOIN instituicao i ON c.instituicao_id = i.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cursos' });
  }
});

router.post('/api/cursos', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const [result] = await pool.query(
      'INSERT INTO curso (nome, instituicao_id) VALUES (?, ?)', 
      [data.nome, data.instituicao_id || null]
    );
    const insertId = (result as any).insertId;
    res.status(201).json({ id: insertId, nome: data.nome, instituicao_id: data.instituicao_id || null });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar curso' });
  }
});

router.put('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    await pool.query(
      'UPDATE curso SET nome = ?, instituicao_id = ? WHERE id = ?', 
      [data.nome, data.instituicao_id || null, id]
    );
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar curso.' });
  }
});

router.delete('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM curso WHERE id = ?', [id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar curso.' });
  }
});

// TURMAS via join com disciplina para usuário
router.get('/api/turmas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const [rows] = await pool.query(`
      SELECT turma.* FROM turma
      JOIN disciplina ON turma.disciplina_id = disciplina.id
      WHERE disciplina.usuario_id = ?
    `, [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar turmas' });
  }
});

router.post('/api/turmas', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const [result] = await pool.query(
      'INSERT INTO turma (codigo, nome, apelido, disciplina_id) VALUES (?, ?, ?, ?)',
      [data.codigo, data.nome, data.apelido || null, data.disciplina_id]
    );
    const insertId = (result as any).insertId;
    res.status(201).json({ id: insertId, ...data });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar turma' });
  }
});

router.put('/api/turmas/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    const [rows] = await pool.query(`
      SELECT turma.* FROM turma
      JOIN disciplina ON turma.disciplina_id = disciplina.id
      WHERE turma.id = ? AND disciplina.usuario_id = ?
    `, [id, userId]);
    const turma = (rows as any[])[0];
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada ou sem permissão' });
    const data = req.body;
    await pool.query('UPDATE turma SET codigo = ?, nome = ?, apelido = ? WHERE id = ?', 
      [data.codigo, data.nome, data.apelido || null, id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar turma.' });
  }
});

router.delete('/api/turmas/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    const [rows] = await pool.query(`
      SELECT disciplina.usuario_id FROM turma 
      JOIN disciplina ON turma.disciplina_id = disciplina.id
      WHERE turma.id = ? AND disciplina.usuario_id = ?
    `, [id, userId]);
    const turma = (rows as any[])[0];
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada ou sem permissão' });
    await pool.query('DELETE FROM turma WHERE id = ?', [id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar turma.' });
  }
});

// Rota para obter turmas por disciplina
router.get('/api/turmas/disciplinas/:id', authenticateToken, async (req, res) => {
  try {
    const disciplinaId = Number(req.params.id);
    const userId = req.user?.id;
    const [rows] = await pool.query(`
      SELECT turma.* FROM turma
      JOIN disciplina ON turma.disciplina_id = disciplina.id
      WHERE disciplina.id = ? AND disciplina.usuario_id = ?
    `, [disciplinaId, userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar turmas por disciplina' });
  }
});

export default router;