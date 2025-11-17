//Desenvolvido por Rafael Inácio|Murillo Iamarino| Guilherme Moreira | Marcelo Zarpelon | Rafael Candian
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDisciplinas, addDisciplina, updateDisciplina, deleteDisciplina } from "../repository/bd.ts";
import { pool } from "../repository/bd.ts";
import { authenticateToken } from "../usuario/authUsers.ts";
import type { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = "segredo_super_secreto";

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

router.get('/alunos', (req, res) => {
  res.render(path.join(__dirname, 'alunos.ejs'));
});

router.get('/componentes', (req, res) => {
  res.render(path.join(__dirname, 'componentes.ejs'));
});

// DISCIPLINAS COM USUÁRIO
router.get('/api/disciplinas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const cursoIdQuery = req.query.curso_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    let query = `
      SELECT d.*, c.nome AS curso_nome
      FROM disciplina d
      LEFT JOIN curso c ON d.curso_id = c.id
      WHERE d.usuario_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (cursoIdQuery) {
      const cursoId = Number(cursoIdQuery);
      
      if (!isNaN(cursoId)) {
        query += ` AND d.curso_id = ?`;
        params.push(cursoId);
      }
    }
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar disciplinas:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: 'Erro ao buscar disciplinas', details: errorMessage });
  }
});

router.get('/api/disciplinas/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const [rows] = await pool.query(
      'SELECT * FROM disciplina WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );
    if (!(rows as any[]).length) return res.status(404).json({ error: 'Disciplina não encontrada' });
    res.json((rows as any[])[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar disciplina por id' });
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
    const userId = req.user?.id;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const [rows] = await pool.query(
      'SELECT usuario_id FROM disciplina WHERE id = ?',
      [id]
    );
    
    const disciplina = (rows as any[])[0];
    
    if (!disciplina) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }
    
    if (disciplina.usuario_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para editar esta disciplina.' });
    }
    
    const data = req.body;
    
    const [result] = await pool.query(
      'UPDATE disciplina SET nome = ?, sigla = ?, codigo = ?, periodo = ? WHERE id = ?',
      [data.nome, data.sigla, data.codigo || null, data.periodo || null, id]
    );
    
    if ((result as any).affectedRows === 0) {
      return res.status(400).json({ error: 'Nenhuma linha foi atualizada' });
    }
    
    res.json({ id, success: true });
  } catch (err) {
    console.error('Erro ao editar disciplina:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: 'Erro ao editar disciplina', details: errorMessage });
  }
});

router.delete('/api/disciplinas/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.id;

    const [discRows] = await pool.query(
      'SELECT usuario_id FROM disciplina WHERE id = ?',
      [id]
    );

    const disciplina = (discRows as any[])[0];
    if (!disciplina) return res.status(404).json({ error: 'Disciplina não encontrada' });
    if (disciplina.usuario_id !== userId) return res.status(403).json({ error: 'Sem permissão' });

    const [turmas] = await pool.query(
      'SELECT COUNT(*) as total FROM turma WHERE disciplina_id = ?',
      [id]
    );

    if ((turmas as any[])[0].total > 0) {
      return res.status(400).json({ error: 'Não é possível deletar. Existem turmas vinculadas. Delete-as primeiro.' });
    }

    await pool.query('DELETE FROM disciplina WHERE id = ?', [id]);
    res.json({ id, message: 'Disciplina deletada com sucesso' });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar disciplina.' });
  }
});

// INSTITUICOES
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

router.get('/instituicoes/:id', authenticateToken, async (req, res) => {
  const instituicaoId = req.params.id;
  const userId = req.user?.id;

  try {
    const [instituicaoRows] = await pool.query(
      'SELECT * FROM instituicao WHERE id = ? AND usuario_id = ?', 
      [instituicaoId, userId]
    );
    const instituicao = (instituicaoRows as any[])[0];
    if (!instituicao) return res.status(404).send('Instituição não encontrada');

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
    const [result] = await pool.query('INSERT INTO instituicao (nome, cnpj, usuario_id) VALUES (?, ?, ?)', [data.nome, data.cnpj || null, userId]);
    const insertId = (result as any).insertId;
    res.status(201).json({ id: insertId, nome: data.nome });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar instituição' });
  }
});

// ✅ ROTA ESPECÍFICA ANTES DA GENÉRICA
router.get('/api/instituicoes/:id/stats', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const [instRows] = await pool.query(
      'SELECT id FROM instituicao WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );

    if ((instRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    // Conta disciplinas
    const [discRows] = await pool.query(`
      SELECT COUNT(*) as total FROM disciplina d
      JOIN curso c ON d.curso_id = c.id
      WHERE c.instituicao_id = ? AND d.usuario_id = ?
    `, [id, userId]);

    // Conta turmas com LEFT JOIN ← MUDANÇA
    const [turmaRows] = await pool.query(`
      SELECT COUNT(DISTINCT t.id) as total FROM turma t
      LEFT JOIN disciplina d ON t.disciplina_id = d.id
      LEFT JOIN curso c ON d.curso_id = c.id
      WHERE c.instituicao_id = ? AND d.usuario_id = ?
    `, [id, userId]);

    const disciplinasCount = (discRows as any[])[0]?.total || 0;
    const turmasCount = (turmaRows as any[])[0]?.total || 0;

    res.json({ disciplinas: disciplinasCount, turmas: turmasCount });
  } catch (err) {
    console.error('Erro ao contar stats:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: 'Erro ao contar estatísticas', details: errorMessage });
  }
});

// ✅ ROTA GENÉRICA DEPOIS DA ESPECÍFICA
router.get('/api/instituicoes/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  const userId = req.user?.id;

  try {
    const [instituicaoRows] = await pool.query(
      'SELECT * FROM instituicao WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );
    
    if (!instituicaoRows || (instituicaoRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    const instituicao = (instituicaoRows as any[])[0];

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
    await pool.query('UPDATE instituicao SET nome = ?, cnpj = ? WHERE id = ?', [data.nome, data.cnpj || null, id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar instituição.' });
  }
});

router.delete('/api/instituicoes/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.id;

    const [instRows] = await pool.query(
      'SELECT usuario_id FROM instituicao WHERE id = ?',
      [id]
    );

    const instituicao = (instRows as any[])[0];
    if (!instituicao) return res.status(404).json({ error: 'Instituição não encontrada' });
    if (instituicao.usuario_id !== userId) return res.status(403).json({ error: 'Sem permissão' });

    // Verifica se tem cursos
    const [cursos] = await pool.query(
      'SELECT COUNT(*) as total FROM curso WHERE instituicao_id = ?',
      [id]
    );

    if ((cursos as any[])[0].total > 0) {
      return res.status(400).json({ error: 'Não é possível deletar. Existem cursos vinculados. Delete-os primeiro.' });
    }

    await pool.query('DELETE FROM instituicao WHERE id = ?', [id]);
    res.json({ id, message: 'Instituição deletada com sucesso' });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar instituição.' });
  }
});

// CURSOS
router.get('/cursos/:id', async (req, res) => {
  const instituicaoId = Number(req.params.id);
  const token = req.query.token as string;
  
  if (!token) {
    return res.status(401).send('Token não fornecido');
  }
  
  let userId: number;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    userId = decoded.id;
  } catch (err) {
    return res.status(403).send('Token inválido ou expirado');
  }

  try {
    const [institutionRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM instituicao WHERE id = ? AND usuario_id = ?', 
      [instituicaoId, userId]
    );

    if (institutionRows.length === 0) {
      console.log('Instituição não encontrada ou sem permissão');
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
    console.error('Erro ao buscar cursos:', err);
    res.status(500).send('Erro ao buscar cursos da instituição');
  }
});

router.get('/api/cursos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const instituicaoIdQuery = req.query.instituicao_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    let query = `
      SELECT c.*, i.nome AS instituicao_nome
      FROM curso c
      LEFT JOIN instituicao i ON c.instituicao_id = i.id
      WHERE c.usuario_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (instituicaoIdQuery) {
      const instituicaoId = Number(instituicaoIdQuery);
      
      if (!isNaN(instituicaoId)) {
        query += ` AND c.instituicao_id = ?`;
        params.push(instituicaoId);
      }
    }
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: 'Erro ao buscar cursos', details: errorMessage });
  }
});

router.post('/api/cursos', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // data deve conter: { nome, instituicao_id }
    const [result] = await pool.query(
      'INSERT INTO curso (nome, instituicao_id, usuario_id) VALUES (?, ?, ?)',
      [data.nome, data.instituicao_id || null, userId]
    );

    const insertId = (result as any).insertId;

    res.status(201).json({
      id: insertId,
      nome: data.nome,
      instituicao_id: data.instituicao_id || null,
      usuario_id: userId
    });
  } catch (err) {
    console.error('Erro ao adicionar curso:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: 'Erro ao adicionar curso', details: errorMessage });
  }
});

router.get('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    const [rows] = await pool.query(
      'SELECT c.*, i.nome AS instituicao_nome FROM curso c LEFT JOIN instituicao i ON c.instituicao_id = i.id WHERE c.id = ? AND c.usuario_id = ?',
      [id, userId]
    );
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    res.json((rows as any[])[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar curso por id' });
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
    const userId = req.user?.id;

    const [cursoRows] = await pool.query(
      'SELECT usuario_id FROM curso WHERE id = ?',
      [id]
    );

    const curso = (cursoRows as any[])[0];
    if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });
    if (curso.usuario_id !== userId) return res.status(403).json({ error: 'Sem permissão' });

    // Verifica se tem disciplinas
    const [disc] = await pool.query(
      'SELECT COUNT(*) as total FROM disciplina WHERE curso_id = ?',
      [id]
    );

    if ((disc as any[])[0].total > 0) {
      return res.status(400).json({ error: 'Não é possível deletar. Existem disciplinas vinculadas. Delete-as primeiro.' });
    }

    await pool.query('DELETE FROM curso WHERE id = ?', [id]);
    res.json({ id, message: 'Curso deletado com sucesso' });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar curso.' });
  }
});

// LISTAR TURMAS
router.get('/api/turmas', authenticateToken, async (req, res) => {
  try {
    
    const userId = req.user?.id;
    const disciplinaId = req.query.disciplina_id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    let query = `
      SELECT t.*, d.nome as disciplina_nome
      FROM turma t
      JOIN disciplina d ON t.disciplina_id = d.id
      WHERE d.usuario_id = ?
    `;

    const params: any[] = [userId];

    if (disciplinaId) {
      query += ` AND t.disciplina_id = ?`;
      params.push(Number(disciplinaId));
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar turmas:", err);
    res.status(500).json({ error: "Erro ao buscar turmas" });
  }
});


// CRIAR TURMA
router.post('/api/turmas', authenticateToken, async (req, res) => {
  try {
    const { codigo, nome, apelido, disciplina_id } = req.body;
    const userId = req.user?.id;

    if (!codigo || !nome || !disciplina_id) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Verifica se disciplina pertence ao usuário
    const [discRows] = await pool.query(
      "SELECT id FROM disciplina WHERE id = ? AND usuario_id = ?",
      [disciplina_id, userId]
    );

    if ((discRows as any[]).length === 0) {
      return res.status(403).json({ error: "Sem permissão para usar esta disciplina." });
    }

    const [result] = await pool.query(
      `INSERT INTO turma (codigo, nome, apelido, disciplina_id, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
       [codigo, nome, apelido || null, disciplina_id, userId]
    );

    res.status(201).json({
      id: (result as any).insertId,
      codigo,
      nome,
      apelido,
      disciplina_id
    });
  } catch (err) {
    console.error("Erro ao adicionar turma:", err);
    res.status(500).json({ error: "Erro ao adicionar turma" });
  }
});

router.get('/api/turmas/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const [rows] = await pool.query(
      `SELECT t.*, d.nome as disciplina_nome
       FROM turma t
       JOIN disciplina d ON t.disciplina_id = d.id
       WHERE t.id = ? AND d.usuario_id = ?`,
      [id, userId]
    );
    if (!(rows as any[]).length) return res.status(404).json({ error: 'Turma não encontrada' });
    res.json((rows as any[])[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar turma por id' });
  }
});

// EDITAR TURMA
router.put('/api/turmas/:id', authenticateToken, async (req, res) => {
  try {
    const turmaId = Number(req.params.id);
    const userId = req.user?.id;
    const { codigo, nome, apelido } = req.body;

    const [rows] = await pool.query(`
      SELECT t.*
      FROM turma t
      JOIN disciplina d ON t.disciplina_id = d.id
      WHERE t.id = ? AND d.usuario_id = ?
    `, [turmaId, userId]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: "Turma não encontrada ou sem permissão." });
    }

    await pool.query(`
      UPDATE turma
      SET codigo = ?, nome = ?, apelido = ?
      WHERE id = ?
    `, [codigo, nome, apelido || null, turmaId]);

    res.json({ id: turmaId, message: "Turma atualizada com sucesso." });
  } catch (err) {
    console.error("Erro ao editar turma:", err);
    res.status(500).json({ error: "Erro ao editar turma." });
  }
});


// DELETAR TURMA
router.delete('/api/turmas/:id', authenticateToken, async (req, res) => {
  try {
    const turmaId = Number(req.params.id);
    const userId = req.user?.id;

    const [turmaRows] = await pool.query(
      `SELECT t.id, d.usuario_id
       FROM turma t
       JOIN disciplina d ON t.disciplina_id = d.id
       WHERE t.id = ?`,
      [turmaId]
    );

    const turma = (turmaRows as any[])[0];
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
    if (turma.usuario_id !== userId) return res.status(403).json({ error: 'Sem permissão' });

    // ✅ Deleta todos os alunos vinculados PRIMEIRO
    await pool.query('DELETE FROM aluno_turma WHERE turma_id = ?', [turmaId]);

    // Depois deleta a turma
    await pool.query('DELETE FROM turma WHERE id = ?', [turmaId]);
    res.json({ id: turmaId, message: 'Turma e todos seus alunos deletados com sucesso' });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar turma.' });
  }
});

// LISTAR ALUNOS DA TURMA
router.get('/api/alunos', authenticateToken, async (req, res) => {
  try {
    const turmaId = req.query.turma_id;
    if (!turmaId) return res.status(400).json({ error: "turma_id é obrigatório." });

    const [rows] = await pool.query(
      `SELECT a.id, a.nome, a.identificador
       FROM aluno a
       JOIN aluno_turma at ON at.aluno_id = a.id
       WHERE at.turma_id = ?`,
      [turmaId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar alunos:", err);
    res.status(500).json({ error: "Erro ao buscar alunos." });
  }
});


// CRIAR ALUNO E VINCULAR À TURMA
router.post('/api/alunos', authenticateToken, async (req, res) => {
  try {
    const { identificador, nome, turma_id } = req.body;
    if (!identificador || !nome || !turma_id) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Verifica se aluno já existe
    let alunoId: number;

    const [checkAluno] = await pool.query(
      "SELECT id FROM aluno WHERE identificador = ?",
      [identificador]
    );

    if ((checkAluno as any[]).length > 0) {
      alunoId = (checkAluno as any[])[0].id;
    } else {
      // Criar aluno novo
      const [insertA] = await pool.query(
        "INSERT INTO aluno (identificador, nome) VALUES (?, ?)",
        [identificador, nome]
      );
      alunoId = (insertA as any).insertId;
    }

    // Verifica se já está vinculado
    const [checkVinculo] = await pool.query(
      "SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?",
      [alunoId, turma_id]
    );

    if ((checkVinculo as any[]).length > 0) {
      return res.status(400).json({ error: "Aluno já vinculado à turma." });
    }

    // Criar vínculo
    await pool.query(
      "INSERT INTO aluno_turma (aluno_id, turma_id) VALUES (?, ?)",
      [alunoId, turma_id]
    );

    res.status(201).json({ id: alunoId, nome, identificador });

  } catch (err) {
    console.error("Erro ao adicionar aluno:", err);
    res.status(500).json({ error: "Erro ao adicionar aluno." });
  }
});


// EDITAR ALUNO
router.put('/api/alunos/:id', authenticateToken, async (req, res) => {
  try {
    const alunoId = req.params.id;
    const { identificador, nome } = req.body;

    if (!identificador || !nome) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    await pool.query(
      "UPDATE aluno SET identificador = ?, nome = ? WHERE id = ?",
      [identificador, nome, alunoId]
    );

    res.json({ id: alunoId, message: "Aluno atualizado com sucesso." });
  } catch (err) {
    console.error("Erro ao editar aluno:", err);
    res.status(500).json({ error: "Erro ao editar aluno." });
  }
});


// REMOVER ALUNO DA TURMA
router.delete('/api/alunos/:id', authenticateToken, async (req, res) => {
  try {
    const alunoId = req.params.id;
    const turmaId = req.query.turma_id;

    if (!turmaId) {
      return res.status(400).json({ error: "turma_id é obrigatório para remover o vínculo." });
    }

    const [rows] = await pool.query(
      "DELETE FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?",
      [alunoId, turmaId]
    );

    res.json({ id: alunoId, message: "Aluno removido da turma." });

  } catch (err) {
    console.error("Erro ao deletar aluno:", err);
    res.status(500).json({ error: "Erro ao deletar aluno." });
  }
});

// LISTAR COMPONENTES DE UMA DISCIPLINA
router.get('/api/componentes', authenticateToken, async (req, res) => {
  try {
    const disciplinaId = req.query.disciplina_id;
    const userId = req.user?.id;

    if (!disciplinaId)
      return res.status(400).json({ error: "disciplina_id é obrigatório." });

    // Verifica se o usuário é dono da disciplina
    const [discRows] = await pool.query(
      "SELECT id FROM disciplina WHERE id = ? AND usuario_id = ?",
      [disciplinaId, userId]
    );

    if ((discRows as any[]).length === 0)
      return res.status(403).json({ error: "Sem permissão para acessar esta disciplina." });

    const [rows] = await pool.query(
      "SELECT * FROM componente_nota WHERE disciplina_id = ? ORDER BY id ASC",
      [disciplinaId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar componentes:", err);
    res.status(500).json({ error: "Erro ao listar componentes." });
  }
});

// CRIAR COMPONENTE DE NOTA
router.post('/api/componentes', authenticateToken, async (req, res) => {
  try {
    const { nome, sigla, descricao, disciplina_id } = req.body;
    const userId = req.user?.id;

    if (!nome || !sigla || !disciplina_id)
      return res.status(400).json({ error: "Campos obrigatórios faltando." });

    // Verifica se disciplina pertence ao usuário
    const [discRows] = await pool.query(
      "SELECT id FROM disciplina WHERE id = ? AND usuario_id = ?",
      [disciplina_id, userId]
    );

    if ((discRows as any[]).length === 0)
      return res.status(403).json({ error: "Sem permissão para essa disciplina." });

    const [result] = await pool.query(
      `INSERT INTO componente_nota (nome, sigla, descricao, disciplina_id)
         VALUES (?, ?, ?, ?)`,
      [nome, sigla.toUpperCase(), descricao || null, disciplina_id]
    );

    res.status(201).json({
      id: (result as any).insertId,
      nome,
      sigla: sigla.toUpperCase(),
      descricao
    });

  } catch (err) {
    console.error("Erro ao criar componente:", err);
    res.status(500).json({ error: "Erro ao criar componente." });
  }
});

// EDITAR COMPONENTE DE NOTA
router.put('/api/componentes/:id', authenticateToken, async (req, res) => {
  try {
    const componenteId = req.params.id;
    const { nome, sigla, descricao } = req.body;
    const userId = req.user?.id;

    // Verifica se o componente pertence ao usuário
    const [rows] = await pool.query(
      `SELECT cn.*, d.usuario_id
       FROM componente_nota cn
       JOIN disciplina d ON d.id = cn.disciplina_id
       WHERE cn.id = ?`,
      [componenteId]
    );

    const comp = (rows as any[])[0];

    if (!comp)
      return res.status(404).json({ error: "Componente não encontrado." });

    if (comp.usuario_id !== userId)
      return res.status(403).json({ error: "Sem permissão para editar." });

    await pool.query(
      `UPDATE componente_nota
       SET nome = ?, sigla = ?, descricao = ?
       WHERE id = ?`,
      [nome, sigla.toUpperCase(), descricao, componenteId]
    );

    res.json({ id: componenteId, success: true });
  } catch (err) {
    console.error("Erro ao editar componente:", err);
    res.status(500).json({ error: "Erro ao editar componente." });
  }
});

// DELETAR COMPONENTE DE NOTA
router.delete('/api/componentes/:id', authenticateToken, async (req, res) => {
  try {
    const componenteId = req.params.id;
    const userId = req.user?.id;

    // Verifica permissão
    const [rows] = await pool.query(
      `SELECT cn.*, d.usuario_id
       FROM componente_nota cn
       JOIN disciplina d ON d.id = cn.disciplina_id
       WHERE cn.id = ?`,
      [componenteId]
    );

    const comp = (rows as any[])[0];

    if (!comp)
      return res.status(404).json({ error: "Componente não encontrado." });

    if (comp.usuario_id !== userId)
      return res.status(403).json({ error: "Sem permissão para deletar." });

    await pool.query("DELETE FROM componente_nota WHERE id = ?", [componenteId]);

    res.json({ id: componenteId, success: true });
  } catch (err) {
    console.error("Erro ao deletar componente:", err);
    res.status(500).json({ error: "Erro ao deletar componente." });
  }
});

// BUSCAR NOTAS DA TURMA PARA EXPORTAÇÃO
router.get('/api/notas/turma/:turmaId', authenticateToken, async (req, res) => {
  try {
    const turmaId = req.params.turmaId;
    const userId = req.user?.id;

    if (!turmaId) return res.status(400).json({ error: "turma_id é obrigatório." });

    // Verifica se o usuário tem acesso à turma
    const [turmaRows] = await pool.query(
      `SELECT t.*, d.usuario_id 
       FROM turma t
       JOIN disciplina d ON d.id = t.disciplina_id
       WHERE t.id = ?`,
      [turmaId]
    );

    const turma = (turmaRows as any[])[0];
    if (!turma) return res.status(404).json({ error: "Turma não encontrada." });
    if (turma.usuario_id !== userId) return res.status(403).json({ error: "Sem permissão." });

    // Busca alunos e notas
    const [notasRows] = await pool.query(
      `SELECT 
        a.id as aluno_id,
        a.identificador,
        a.nome,
        cn.id as componente_id,
        cn.sigla as componente_sigla,
        n.valor
      FROM aluno_turma at
      JOIN aluno a ON a.id = at.aluno_id
      CROSS JOIN componente_nota cn
      LEFT JOIN nota n ON n.aluno_turma_id = at.id AND n.componente_id = cn.id
      WHERE at.turma_id = ? 
        AND cn.disciplina_id = ?
      ORDER BY a.nome, cn.sigla`,
      [turmaId, turma.disciplina_id]
    );

    res.json(notasRows);
  } catch (err) {
    console.error("Erro ao buscar notas:", err);
    res.status(500).json({ error: "Erro ao buscar notas." });
  }
});

// OBTER FÓRMULA DE NOTA FINAL
router.get('/api/formula-nota-final/:disciplinaId', authenticateToken, async (req, res) => {
  try {
    const disciplinaId = req.params.disciplinaId;
    const userId = req.user?.id;

    if (!disciplinaId) return res.status(400).json({ error: "disciplina_id é obrigatório." });

    // Verifica se o usuário tem acesso à disciplina
    const [discRows] = await pool.query(
      "SELECT id FROM disciplina WHERE id = ? AND usuario_id = ?",
      [disciplinaId, userId]
    );

    if ((discRows as any[]).length === 0)
      return res.status(403).json({ error: "Sem permissão para acessar esta disciplina." });

    const [rows] = await pool.query(
      "SELECT * FROM formula_nota_final WHERE disciplina_id = ?",
      [disciplinaId]
    );

    const formula = (rows as any[])[0];
    res.json(formula || null);
  } catch (err) {
    console.error("Erro ao buscar fórmula:", err);
    res.status(500).json({ error: "Erro ao buscar fórmula." });
  }
});

// SALVAR/ATUALIZAR FÓRMULA DE NOTA FINAL
router.post('/api/formula-nota-final', authenticateToken, async (req, res) => {
  try {
    const { disciplina_id, expressao } = req.body;
    const userId = req.user?.id;

    if (!disciplina_id || !expressao) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // Verifica se o usuário tem acesso à disciplina
    const [discRows] = await pool.query(
      "SELECT id FROM disciplina WHERE id = ? AND usuario_id = ?",
      [disciplina_id, userId]
    );

    if ((discRows as any[]).length === 0)
      return res.status(403).json({ error: "Sem permissão para essa disciplina." });

    // Buscar componentes da disciplina para validar
    const [componentesRows] = await pool.query(
      "SELECT sigla FROM componente_nota WHERE disciplina_id = ?",
      [disciplina_id]
    );

    const componentes = (componentesRows as any[]).map(c => c.sigla);
    
    if (componentes.length === 0) {
      return res.status(400).json({ error: "Não há componentes cadastrados para esta disciplina." });
    }

    // Validar se todos os componentes estão na fórmula
    const componentesNaFormula = componentes.filter(sigla => {
      // Verifica se a sigla aparece na fórmula (case insensitive)
      const regex = new RegExp(`\\b${sigla}\\b`, 'i');
      return regex.test(expressao);
    });

    if (componentesNaFormula.length !== componentes.length) {
      const faltando = componentes.filter(c => !componentesNaFormula.includes(c));
      return res.status(400).json({ 
        error: `Todos os componentes devem estar na fórmula. Faltando: ${faltando.join(', ')}` 
      });
    }

    // Validar se a fórmula pode gerar nota final de 10 e não ultrapassa 10
    try {
      // Criar uma cópia da expressão para teste
      let expressaoTeste = expressao;
      
      // Substituir todas as siglas por 10 (valor máximo)
      // componentes é um array de strings (siglas), não objetos
      componentes.forEach(sigla => {
        const regex = new RegExp(`\\b${sigla}\\b`, 'gi');
        expressaoTeste = expressaoTeste.replace(regex, '10');
      });

      // Avaliar a expressão
      const resultado = Function('"use strict"; return (' + expressaoTeste + ')')();
      
      // Verificar se o resultado é exatamente 10 (com tolerância de 0.01 para erros de ponto flutuante)
      const diferenca = Math.abs(resultado - 10);
      if (diferenca > 0.01) {
        if (resultado > 10) {
          return res.status(400).json({ 
            error: `A fórmula pode gerar nota final maior que 10. Quando todas as notas são 10, o resultado é ${resultado.toFixed(2)}. Ajuste a fórmula para que a soma dos pesos/coeficientes seja igual a 1.` 
          });
        } else {
          return res.status(400).json({ 
            error: `A fórmula não permite alcançar nota final 10. Quando todas as notas são 10, o resultado é ${resultado.toFixed(2)}. Ajuste a fórmula para que a soma dos pesos/coeficientes seja igual a 1.` 
          });
        }
      }
    } catch (err) {
      console.error('Erro ao validar fórmula:', err);
      return res.status(400).json({ 
        error: `Erro ao validar a fórmula. Verifique se a expressão está correta.` 
      });
    }

    // Verifica se já existe fórmula
    const [formulaExistente] = await pool.query(
      "SELECT id FROM formula_nota_final WHERE disciplina_id = ?",
      [disciplina_id]
    );

    if ((formulaExistente as any[]).length > 0) {
      // Atualiza fórmula existente
      await pool.query(
        "UPDATE formula_nota_final SET expressao = ? WHERE disciplina_id = ?",
        [expressao, disciplina_id]
      );
    } else {
      // Insere nova fórmula
      await pool.query(
        "INSERT INTO formula_nota_final (disciplina_id, expressao) VALUES (?, ?)",
        [disciplina_id, expressao]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar fórmula:", err);
    res.status(500).json({ error: "Erro ao salvar fórmula." });
  }
});

// SALVAR/ATUALIZAR NOTA
router.post('/api/notas', authenticateToken, async (req, res) => {
  try {
    const { aluno_id, turma_id, componente_sigla, valor } = req.body;
    const userId = req.user?.id;

    if (!aluno_id || !turma_id || !componente_sigla || valor === undefined || valor === null || valor === '') {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // Verifica se o usuário tem acesso à turma
    const [turmaRows] = await pool.query(
      `SELECT t.*, d.usuario_id 
       FROM turma t
       JOIN disciplina d ON d.id = t.disciplina_id
       WHERE t.id = ?`,
      [turma_id]
    );

    const turma = (turmaRows as any[])[0];
    if (!turma) return res.status(404).json({ error: "Turma não encontrada." });
    if (turma.usuario_id !== userId) return res.status(403).json({ error: "Sem permissão." });

    // Busca aluno_turma_id
    const [alunoTurmaRows] = await pool.query(
      `SELECT id FROM aluno_turma WHERE aluno_id = ? AND turma_id = ?`,
      [aluno_id, turma_id]
    );

    const alunoTurma = (alunoTurmaRows as any[])[0];
    if (!alunoTurma) return res.status(404).json({ error: "Aluno não encontrado na turma." });

    // Busca componente_id pela sigla
    const [componenteRows] = await pool.query(
      `SELECT id FROM componente_nota WHERE sigla = ? AND disciplina_id = ?`,
      [componente_sigla, turma.disciplina_id]
    );

    const componente = (componenteRows as any[])[0];
    if (!componente) return res.status(404).json({ error: "Componente não encontrado." });

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico < 0 || valorNumerico > 10) {
      return res.status(400).json({ error: "Valor da nota deve estar entre 0 e 10." });
    }

    // Verifica se já existe nota
    const [notaExistente] = await pool.query(
      `SELECT id FROM nota WHERE aluno_turma_id = ? AND componente_id = ?`,
      [alunoTurma.id, componente.id]
    );

    if ((notaExistente as any[]).length > 0) {
      // Atualiza nota existente
      await pool.query(
        `UPDATE nota SET valor = ? WHERE aluno_turma_id = ? AND componente_id = ?`,
        [valorNumerico, alunoTurma.id, componente.id]
      );
    } else {
      // Insere nova nota
      await pool.query(
        `INSERT INTO nota (aluno_turma_id, componente_id, valor) VALUES (?, ?, ?)`,
        [alunoTurma.id, componente.id, valorNumerico]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar nota:", err);
    res.status(500).json({ error: "Erro ao salvar nota." });
  }
});

export default router;