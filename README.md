# PSM - Prisma Safe Migrate

## Description

**PSM (Prisma Safe Migrate)** is an advanced tool for generating and safely applying SQL migrations based on the Prisma model. Its main objective is to ensure that database changes are applied without risk of data loss, something that Prisma's standard migration system does not fully guarantee.

---

## Motivation

Database migrations are critical processes that need to preserve the integrity of existing data. Prisma provides an efficient migration system, but it does not guarantee absolute data loss due to complex changes, such as renaming columns, changing data types, or dropping tables.

PSM fills this gap by creating an extra layer of validation, strict revision control, and safe incremental application in production environments.

---

## Installation

Install the PSM packages as development dependencies in your project:

```bash
npm install --save-dev @prisma-psm/core @prisma-psm/pg
```

---

## Configuration

In your `schema.prisma` file, configure the PSM generator to generate the SQL files and connect to the database:

```prisma
generator psm {
    provider = "psm generate"
    output = "./psm/"
    driver = "@prisma-psm/pg"
    url = env("DATABASE_URL")
}
```

- **provider**: PSM generator that replaces Prisma's default migration generator.
- **output**: directory where the SQL files and PSM artifacts will be generated. - **driver**: Database-specific driver (e.g., PostgreSQL).
- **url**: Environment variable containing the database connection string.

---

## How it works - General flow

### 1. Migration generation (`npx prisma generate`)

- Generates Prisma artifacts normally.
- Generates two main files in the `next` folder:
- `migration.next.check.sql`: Script to validate whether the migration is consistent with the current database.
- `migration.next.sql`: Script that will apply the changes.
- If `DATABASE_URL` is configured:
- Automatically executes the check script.
- If successful: Keeps both files in the `next` folder.
- If failed: Keeps only `migration.next.check.sql` and an error file, removing `migration.next.sql` if it exists. - If `DATABASE_URL` is not defined:
- Only generates both files, without validating.
- Updates the `psm.yml` file with migration information, such as status, driver, URL, schema, and history.

### 2. Applying the migration (`psm commit`)

- Validates the migration again by running `migration.next.check.sql`.
- If validated:
- Applies `migration.next.sql` to the database.
- Generates a definitive revision in `revision/${timestamp}-${label}/` with:
- Applied migration script.
- Updated `psm.yml` file.
- Registers the applied migration in the database for control.
- If failure occurs, abort and display the error.

### 3. Deploy to production (`psm deploy`)

- Applies all pending revisions stored in the `revision/` folder incrementally. - Ensures the database is always synchronized with the migration history.

---

## Detailed Migration Engine

PSM uses a temporary shadow schema to ensure data security:

1. Creates a temporary schema `shadow_${random}`.
2. Creates temporary tables for each Prisma model, without constraints (e.g., `temp_1_user` for the `user` model).
3. Copies data from the real tables to the temporary tables.
4. Applies constraints (keys, indexes, relationships) to the temporary tables.
5. If everything passes during validation (check):
- Removes the shadow schema and temporary tables.
6. If everything passes during application (migrate next):
- Removes the real tables.
- Moves the temporary tables from the shadow schema to the final schema.
- Renames the temporary tables to their real names.
- Removes the shadow schema. - Records the applied migration in the database for control purposes.

This process prevents direct destructive changes to the actual tables before full validation, preventing data loss.

---

## Generated file structure

- **next/**
- `migration.next.check.sql` — script to validate the migration.
- `migration.next.sql` — script to apply the migration.
- (optional) error file in case of failure.
- **revision/${timestamp}-${label}/**
- `migration.sql` — final migration script.
- `psm.yml` — metadata and history of the applied migration.
- **psm.yml**
- Main file with status, configurations, history, and validation results.

---

## Environment Variable

Configure the connection to your database in the `.env` file or in the environment:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/yourbank"
```

---
## Main Commands

| Command | Description |
|-----------------------|------------------------------------------------------------------------|
| `npx prisma generate` | Generates the migration files in the `next` folder and validates them (if `DATABASE_URL` is set). |
| `psm commit` | Validates and applies the next migration. Creates the final revision in the `revision/` folder. |
| `psm deploy` | Applies all pending migrations from the `revision/` folder in the correct order. |

---

## Usage Example

```bash
# Generate migration and validate (if DATABASE_URL is set)
npx prisma generate

# Validate and apply the generated migration
psm commit

# Apply all pending migrations in production
psm deploy
```

---

## Benefits

- **Data loss guarantee** with strict validation. - Easy rollback and revision control.
- Automatic validation during migration generation.
- Detailed history of applied changes.
- Initial support for PostgreSQL, with expansion options.

---

## Roadmap

- Support for more databases (MySQL, SQLite, etc.).
- Graphical interface for migration management.
- Integration with CI/CD pipelines.
- Manual and custom migrations.
- Multi-schema and multi-tenant support.

---

## Contribution

Contributions are welcome! Open issues for bugs or suggestions, and send pull requests for improvements.

---

## License

Project licensed under [Apache 2.0](./LICENSE).

---

## Traduções

[Português](./README.pt.md) | [English](./README.en.md)

---

## Contact

For questions, suggestions, or support, open an issue or contact us via email.

---

**PSM - Safe and reliable migrations for your database with Prisma.**
