// filename: src/tools/commit.ts

import * as fs from "node:fs";
import * as Path from "node:path";
import * as yaml from "yaml";
import * as tar from "tar";
import chalk from "chalk";
import {PSMConfigFile} from "../configs";
import * as cp from "node:child_process";
import {fetch} from "./deploy";
import {psmLockup} from "./common";
import {getLatestFolder, gitAddPath, sanitizeLabel} from "../utils/fs";







export interface MigrateOptions {
    schema?:string
    generate?:string
    label?:string
    "generate-command":string
}
export async function commit(opts:MigrateOptions ) {
    require('dotenv').config();
    if( opts.generate ) {
        let command = opts["generate-command"];
        if( !command) command = "prisma generate"
        cp.spawnSync( "npx", [ ...command.split(" ") ], {
            cwd: process.cwd()
        });
    }

    const { psm, psm_sql, driver, home } = await psmLockup({ schema: opts.schema });
    const next = Path.join( psm.psm.output, "next/migration.next.sql");
    const check = Path.join( psm.psm.output, "next/migration.next.check.sql");

    if( !fs.existsSync( check) ) {
        throw new Error( "Migrate error: next/migration.next.check.sql file not found!" );
    }
    if( !fs.existsSync( next) ) {
        throw new Error(  "Migrate error: next/migration.next.sql file not found!" );
    }


    const migrator = driver.migrator({
        url: process.env[ psm.psm.url ],
        migrate: fs.readFileSync( next ).toString(),
        check: fs.readFileSync( check ).toString(),
        core: fs.readFileSync( psm_sql ).toString(),
    });

    let result = await migrator.core();
    if( !result.success ) {
        console.error( result.error );
        result.messages.forEach( error => {
            console.error( error );
        });
        throw new Error( "Migrate error: Core failed!" );
    }

    const fetchResponse = await fetch({
        psm: psm,
        driver: driver,
        home: home
    });

    if( fetchResponse.error ) {
        throw fetchResponse.error;
    }

    const noPulled = fetchResponse.revs.filter( n=> !n.pulled );


    if( noPulled.length ) {
        throw new Error( `Commit not pulled already exists! Please run ${chalk.bold("psm deploy")} first!` );
    }

    result = await migrator.test();
    if( !result.success ) {
        console.error( result.error );
        result.messages.forEach( error => {
            console.error( error );
        });
        throw new Error( "Migrate error: Check shadow failed!" );
    }

    const dump = await migrator.dump();
    if( dump.error ){
        throw dump.error;
    }

    result = await migrator.migrate();
    if( !result.success ) {
        console.error( result.error );
        result.messages.forEach( error => {
            console.error( error );
        });
        throw new Error( "Migrate error: Commit migration failed!" );
    }

    const moment = require('moment');
    let label = "";
    if( !!opts.label ) label = ` - ${sanitizeLabel( opts.label )}`;
    let preview:PSMConfigFile;
    const last = getLatestFolder( Path.join( home, `psm/revisions/schema`));
    if( !!last ){
        preview = yaml.parse( fs.readFileSync( Path.join( home, "psm/revisions/schema", last, "psm.yml")).toString() ) as  PSMConfigFile;
    }
    psm.migration = {
        revision: `${ moment().format( 'YYYYMMDDHHmmss' ) } - ${psm.psm.migration}`,
        instate: moment().format( 'YYYYMMDDHHmmss' ),
        preview: preview?.migration.revision,
        label: opts.label
    }
    const nextRev = Path.join( home, `psm/revisions/schema/${psm.migration.instate}${label}`);

    fs.mkdirSync( nextRev, { recursive: true });
    fs.renameSync( next, Path.join( nextRev, "migration.sql" ) );
    fs.writeFileSync( Path.join( nextRev, "psm.yml" ), yaml.stringify( psm ) );
    fs.writeFileSync( Path.join(nextRev, "backup.sql"), dump.output );

    fs.unlinkSync( check );

    const archiveName = Path.join(home || process.cwd(), `psm/revisions/schema/${psm.migration.instate}${label}.tar.gz`);

    await tar.c(
        {
            gzip: {
                level: 9
            },
            file: archiveName,
            cwd: Path.dirname(nextRev)
        },
        [Path.basename(nextRev)]
    );

    console.log(chalk.green(`✔ Migration compactada: ${archiveName}`));

    fs.rmSync(nextRev, { recursive: true, force: true });

    gitAddPath(home || process.cwd(), archiveName );
}