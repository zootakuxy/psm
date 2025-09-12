// filename: src/tools/backup.ts

import * as fs from "node:fs";
import * as Path from "node:path";
import * as tar from "tar";
import * as cp from "node:child_process";
import chalk from "chalk";

import {psmLockup} from "./common";
import {gitAddPath, sanitizeLabel} from "../utils/fs";

export interface BackupOptions {
    schema?: string;
    label?: string;
}

export async function backup(opts: BackupOptions) {
    require('dotenv').config();

    const { psm, psm_sql, driver, home } = await psmLockup({ schema: opts.schema });

    const migrator = driver.migrator({
        url: process.env[psm.psm.url],
        migrate: '',  // Não necessário para backup
        check: '',
        core: fs.readFileSync(psm_sql).toString(),
    });

    // Executa dump
    const dump = await migrator.dump();
    if (dump.error) throw dump.error;

    const moment = require('moment');
    const instant = moment().format('YYYYMMDDHHmmss');
    const label = opts.label ? ` - ${sanitizeLabel(opts.label)}` : '';

    const tmpDir = Path.join(home, `psm/backup/tmp-${instant}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(Path.join(tmpDir, 'backup.sql'), dump.output);

    const archiveName = Path.join(home, `psm/backup/${instant}${label}.tar.gz`);

    await tar.c(
        {
            gzip: {
                level: 9
            },
            file: archiveName,
            cwd: Path.dirname(tmpDir)
        },
        [Path.basename(tmpDir)]
    );

    console.log(chalk.green(`✔ Backup gerado: ${archiveName}`));

    // Remove pasta temporária
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // Adiciona o .tar.gz ao git
    gitAddPath(home || process.cwd(), archiveName);
}
