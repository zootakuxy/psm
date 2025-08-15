
# PSM - Prisma Safe Migrate

## Descrição

**PSM (Prisma Safe Migrate)** é uma ferramenta avançada para geração e aplicação segura de migrações SQL baseadas no modelo Prisma. Seu principal objetivo é garantir que alterações no banco de dados sejam aplicadas sem risco de perda de dados, algo que o sistema padrão de migrações do Prisma não assegura completamente.

---

## Motivação

Migrações de banco de dados são processos críticos que precisam preservar a integridade e os dados existentes. O Prisma fornece um sistema eficiente para migrações, porém sem garantias absolutas contra perda de dados em alterações complexas, como renomear colunas, alterar tipos de dados ou remover tabelas.

O PSM preenche essa lacuna ao criar uma camada extra de validação, controle rigoroso de revisões e aplicação incremental segura em ambientes de produção.

---

## Instalação

Instale os pacotes do PSM como dependências de desenvolvimento no seu projeto:

```bash
npm install --save-dev @prisma-psm/core @prisma-psm/pg
```

---

## Configuração

No seu arquivo `schema.prisma`, configure o gerador do PSM para gerar os arquivos SQL e conectar ao banco:

```prisma
generator psm {
  provider = "psm migrate generate"
  output   = "./psm/"
  driver   = "@prisma-psm/pg"
  url      = env("DATABASE_URL")
}
```

- **provider**: gerador do PSM que substitui o padrão do Prisma para geração de migrações.
- **output**: diretório onde serão gerados os arquivos SQL e artefatos do PSM.
- **driver**: driver específico para o banco (exemplo: PostgreSQL).
- **url**: variável de ambiente contendo a string de conexão ao banco.

---

## Como funciona - Fluxo geral

### 1. Geração da migração (`npx prisma generate`)

- Gera os artefatos do Prisma normalmente.
- Gera dois arquivos principais na pasta `next`:
    - `migration.next.check.sql`: script para validar se a migração está consistente com o banco atual.
    - `migration.next.sql`: script que aplicará as alterações.
- Se `DATABASE_URL` estiver configurada:
    - Executa automaticamente o script de check.
    - Se sucesso: mantém os dois arquivos na pasta `next`.
    - Se falha: mantém só `migration.next.check.sql` e um arquivo de erro, removendo `migration.next.sql` se existir.
- Se `DATABASE_URL` não estiver definida:
    - Apenas gera ambos os arquivos, sem validar.
- Atualiza o arquivo `psm.yml` com informações da migração, como status, driver, URL, esquema, e histórico.

### 2. Aplicação da migração (`psm migrate commit`)

- Valida novamente a migração executando `migration.next.check.sql`.
- Se validado:
    - Aplica o `migration.next.sql` no banco.
    - Gera uma revisão definitiva em `revision/${timestamp}-${label}/` com:
        - Script da migração aplicada.
        - Arquivo `psm.yml` atualizado.
    - Registra no banco a migração aplicada para controle.
- Se falha, aborta e mostra o erro.

### 3. Deploy em produção (`psm migrate deploy`)

- Aplica todas as revisões pendentes armazenadas na pasta `revision/` de forma incremental.
- Garante que o banco esteja sempre sincronizado com o histórico de migrações.

---

## Motor de migração (engine) detalhado

O PSM usa um esquema shadow temporário para garantir segurança dos dados:

1. Cria um schema temporário `shadow_${random}`.
2. Cria tabelas temporárias para cada modelo Prisma, sem constraints (ex: `temp_1_user` para o modelo `user`).
3. Copia os dados das tabelas reais para as temporárias.
4. Aplica as constraints (chaves, índices, relacionamentos) nas tabelas temporárias.
5. Se na validação (check) tudo passar:
    - Remove o schema shadow e as tabelas temporárias.
6. Se na aplicação (migrate next) tudo passar:
    - Remove as tabelas reais.
    - Move as tabelas temporárias do schema shadow para o schema final.
    - Renomeia as tabelas temporárias para os nomes reais.
    - Remove o schema shadow.
    - Registra a migração aplicada no banco para controle.

Esse processo impede alterações destrutivas diretas nas tabelas reais antes da validação completa, evitando perda de dados.

---

## Estrutura de arquivos gerados

- **next/**
    - `migration.next.check.sql` — script para validar a migração.
    - `migration.next.sql` — script para aplicar a migração.
    - (opcional) arquivo de erro em caso de falha.
- **revision/${timestamp}-${label}/**
    - `migration.sql` — script definitivo da migração.
    - `psm.yml` — metadados e histórico da migração aplicada.
- **psm.yml**
    - Arquivo principal com estado, configurações, histórico e resultados das validações.

---

## Variável de ambiente

Configure a conexão com seu banco no arquivo `.env` ou no ambiente:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/seubanco"
```

---

## Comandos principais

| Comando               | Descrição                                                                              |
|-----------------------|----------------------------------------------------------------------------------------|
| `npx prisma generate` | Gera os arquivos de migração na pasta `next` e valida (se `DATABASE_URL` configurada). |
| `psm migrate commit`  | Valida e aplica a próxima migração. Cria revisão definitiva na pasta `revision/`.      |
| `psm migrate deploy`  | Aplica todas as migrações pendentes da pasta `revision/` na ordem correta.             |

---

## Exemplo de uso

```bash
# Gerar migração e validar (se DATABASE_URL definida)
npx prisma generate

# Validar e aplicar a migração gerada
psm migrate commit

# Aplicar todas as migrações pendentes em produção
psm migrate deploy
```

---

## Benefícios

- **Garantia contra perda de dados** com validação rigorosa.
- **Rollback facilitado** e controle de revisões.
- **Validação automática** durante geração de migrações.
- **Histórico detalhado** das alterações aplicadas.
- **Suporte inicial para PostgreSQL**, com possibilidade de expansão.

---

## Roadmap

- Suporte a mais bancos (MySQL, SQLite, etc.).
- ‘Interface’ gráfica para gestão de migrações.
- Integração com pipelines CI/CD.
- Migrações manuais e customizadas.
- Suporte multi-schema e multi-tenant.

---

## Contribuição

Contribuições são bem-vindas! Abra issues para bugs ou sugestões, e envie pull requests para melhorias.

---

## Licença

Projeto licenciado sob a [Apache 2.0](./LICENSE).

---

## Traduções

[Português](./README.pt.md) | [English](./README.en.md)

---

## Contato

Para dúvidas, sugestões ou suporte, abra uma issue ou entre em contato via email.

---

**PSM - Migrações seguras e confiáveis para seu banco de dados com Prisma.**