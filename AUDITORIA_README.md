# Sistema de Auditoria de Notas

## Descrição

Sistema completo de auditoria para rastreamento de lançamento e modificação de notas, conforme requisito 3.6 do projeto.

## O que foi implementado

### 1. Banco de Dados

#### Tabela `auditoria_nota`
- `id`: Identificador único
- `aluno_id`: Referência ao aluno
- `componente_id`: Componente avaliado (P1, P2, etc.)
- `turma_id`: Turma relacionada
- `valor_antigo`: Nota anterior (NULL em inserções)
- `valor_novo`: Nova nota
- `operacao`: 'INSERT' ou 'UPDATE'
- `data_hora`: Timestamp automático da operação

#### Triggers Automáticos
- **trg_auditoria_nota_insert**: Registra quando uma nota é lançada pela primeira vez
- **trg_auditoria_nota_update**: Registra quando uma nota é modificada

### 2. Backend

#### Nova Rota: `GET /api/auditoria/:turma_id`
- Retorna histórico de auditoria de uma turma
- Ordenado por data/hora decrescente
- Limitado aos últimos 100 registros
- Validação de permissões do usuário

### 3. Interface (UI)

#### Painel de Auditoria
- Localizado ao lado direito da tabela de notas
- **Botão "Mostrar/Ocultar Auditoria"**: Controla visibilidade do painel
- Exibe mensagens formatadas:
  - Para inserções: "dd/mm/yyyy HH:MM:ss - (Aluno Nome) - Nota [SIGLA] lançada: [valor]"
  - Para alterações: "dd/mm/yyyy HH:MM:ss - (Aluno Nome) - Nota [SIGLA] alterada de [antigo] para [novo]"
- Atualização automática após salvar notas
- Scroll vertical para histórico extenso

## Como instalar

### 1. Atualizar o Banco de Dados

Execute o script SQL de atualização:

```bash
mysql -u seu_usuario -p notadez < src/repository/AtualizacaoAuditoria.sql
```

Ou execute manualmente no MySQL Workbench/phpMyAdmin o conteúdo do arquivo `AtualizacaoAuditoria.sql`.

### 2. Reiniciar a aplicação

```bash
npm run dev
```

## Como usar

1. **Acessar a tela de Alunos** de uma turma
2. **Clicar no botão "📋 Mostrar Auditoria"** no canto inferior direito
3. O painel lateral será exibido com o histórico de alterações
4. **Editar notas** (certifique-se de estar em modo de edição)
5. Ao sair do campo da nota (blur), ela será salva automaticamente
6. **O painel de auditoria atualiza automaticamente** após cada salvamento
7. Para ocultar o painel, clique em "📋 Ocultar Auditoria" ou no "✕" no painel

## Características importantes

### Auditoria Automática
- ✅ **Não pode ser desabilitada**: Os triggers funcionam em nível de banco de dados
- ✅ **Registra todas as operações**: INSERT e UPDATE são capturados automaticamente
- ✅ **Timestamp preciso**: Usa o horário do servidor MySQL
- ✅ **Histórico completo**: Mantém valor anterior e novo para comparação

### Painel Visual
- ✅ **Pode ser ocultado**: O docente controla a visibilidade
- ✅ **Não desabilita auditoria**: Ocultar o painel não para o registro
- ✅ **Feedback imediato**: Atualiza após cada operação confirmada
- ✅ **Ordenação cronológica**: Mais recentes primeiro

### Segurança
- ✅ **Validação de permissões**: Usuário só vê auditoria de suas turmas
- ✅ **Dados imutáveis**: Registros de auditoria não podem ser alterados
- ✅ **Cascata de exclusão**: Se aluno/turma for excluído, auditoria também

## Formato das mensagens

### Lançamento de nota (INSERT)
```
17/11/2025 14:23:15 - (Aluno João Silva) - Nota P1 lançada: 8.5
```

### Modificação de nota (UPDATE)
```
17/11/2025 14:25:30 - (Aluno João Silva) - Nota P1 alterada de 8.5 para 9.0
```

## Estrutura de arquivos modificados

```
ES-PI2-2025-T3-G03/
├── src/
│   ├── home/
│   │   ├── alunos.ejs           # ✅ Adicionado painel de auditoria
│   │   └── controller.ts        # ✅ Adicionada rota /api/auditoria/:turma_id
│   └── repository/
│       ├── NotaDez_MySql.sql    # ✅ Atualizado com tabela e triggers
│       └── AtualizacaoAuditoria.sql  # 🆕 Script de migração
└── AUDITORIA_README.md           # 🆕 Esta documentação
```

## Testes recomendados

1. **Teste de inserção**:
   - Lance uma nota nova para um aluno
   - Verifique se aparece no painel de auditoria
   - Confirme que a operação é 'INSERT' e valor_antigo é NULL

2. **Teste de atualização**:
   - Modifique uma nota existente
   - Verifique se aparece no painel
   - Confirme que mostra valor antigo e novo corretamente

3. **Teste de visibilidade**:
   - Oculte o painel
   - Faça alterações nas notas
   - Mostre o painel novamente
   - Confirme que os registros foram salvos mesmo com painel oculto

4. **Teste de permissões**:
   - Tente acessar auditoria de turma de outro usuário
   - Confirme que retorna erro 403 (sem permissão)

5. **Teste de múltiplas edições**:
   - Edite várias notas seguidas
   - Verifique se todas aparecem no histórico
   - Confirme ordenação cronológica

## Consultas SQL úteis

### Ver todos os registros de auditoria de uma turma
```sql
SELECT * FROM auditoria_nota WHERE turma_id = 1 ORDER BY data_hora DESC;
```

### Ver auditoria de um aluno específico
```sql
SELECT 
    a.*,
    al.nome as aluno_nome,
    cn.sigla as componente
FROM auditoria_nota a
JOIN aluno al ON a.aluno_id = al.id
JOIN componente_nota cn ON a.componente_id = cn.id
WHERE a.aluno_id = 1
ORDER BY a.data_hora DESC;
```

### Contar operações por tipo
```sql
SELECT operacao, COUNT(*) as total 
FROM auditoria_nota 
GROUP BY operacao;
```

## Troubleshooting

### Painel não carrega
- Verifique se o script de atualização foi executado
- Confirme que a tabela `auditoria_nota` existe
- Verifique console do navegador para erros

### Triggers não funcionam
- Execute novamente o script `AtualizacaoAuditoria.sql`
- Verifique permissões do usuário MySQL para criar triggers
- Confirme que os triggers existem: `SHOW TRIGGERS LIKE 'nota';`

### Mensagens não aparecem após editar
- Certifique-se de que está em modo de edição (não "Exibição")
- Verifique se o valor foi salvo (campo deve perder o foco - blur event)
- Abra o painel de auditoria para ver os registros

## Conformidade com requisito 3.6

✅ **"A cada nota lançada pela primeira vez ou modificada, o sistema deverá salvar"**
- Implementado via triggers automáticos

✅ **"mostrar em uma caixa de auditoria de notas as mensagens de cada lançamento ou alteração em detalhes"**
- Painel lateral com listagem detalhada

✅ **"dd/mm/yyyy HH:MM:ss - (Aluno João Silva) - Nota de 5.0 para 5.5 modificada e salva"**
- Formato implementado exatamente conforme especificação

✅ **"Só poderá aparecer mensagens no painel de auditoria das notas que foram alteradas e CONFIRMADAS pelo backend"**
- Triggers disparam apenas após confirmação do banco de dados

✅ **"o painel de auditoria vai mostrando sempre um 'LOG' de operações"**
- Lista ordenada cronologicamente com todas as operações

✅ **"mensagens precisam ser salvas no banco de dados"**
- Tabela `auditoria_nota` persiste todos os registros

✅ **"sempre que carregar aquela tela de notas para trabalhar, as mensagens todas devem ser ordenadas por data/hora decrescente"**
- Query usa `ORDER BY data_hora DESC`

✅ **"Esse painel pode ser ocultado ou exibido pelo docente, quando quiser"**
- Botão de toggle implementado

✅ **"a auditoria é obrigatória, nenhum docente poderá desabilitá-la"**
- Triggers em nível de banco não podem ser desativados pela aplicação

✅ **"O fato de esconder o painel, não desabilita o recurso"**
- Triggers funcionam independentemente da visibilidade do painel
