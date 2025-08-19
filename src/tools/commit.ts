import * as fs from "node:fs";
import * as Path from "node:path";
import * as yaml from "yaml";
import {PSMConfigFile} from "../configs";
import {PSMDriver} from "../driver";
import { spawnSync } from "node:child_process";
import {fetch} from "./deploy";
import chalk from "chalk";
import {psmLockup} from "./common";


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
        spawnSync( "npx", [ ...command.split(" ") ], {
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
    fs.writeFileSync(  Path.join( nextRev, "psm.yml" ), yaml.stringify( psm ) );
    fs.unlinkSync( check );
}


// Função para obter a pasta com maior instante
function getLatestFolder(basePath:string) {
    if (!fs.existsSync(basePath)) return null;
    const dirs = fs.readdirSync(basePath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => /^\d{14}( - .+)?$/.test(name))
        .sort((a, b) => b.localeCompare(a));
    return dirs[0] || null;
}

function sanitizeLabel( label:string ) {
    return label
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // remove caracteres inválidos no Windows
        .replace(/[\u{0080}-\u{FFFF}]/gu, '')  // remove caracteres não ASCII (opcional)
        .trim()
        .replace(/\s+/g, ' ');                 // normaliza espaços
}