import * as fs from "node:fs";
import * as yaml from "yaml";
import * as Path from "node:path";
import {PSMConfigFile} from "../configs";
import {PSMDriver} from "../driver";
import { spawnSync } from "node:child_process";
import moment from "moment/moment";

const prisma = [
    `${process.cwd()}/schema.prisma`,
    `${process.cwd()}/prisma/schema.prisma`,
];

export interface MigrateOptions {
    schema?:string
    generate?:string
    label?:string
    "generate-command":string
}
export async function migrate( opts:MigrateOptions ) {
    require('dotenv').config();
    if( opts.generate ) {
        let command = opts["generate-command"];
        if( !command) command = "prisma generate"
        spawnSync( "npx", [ ...command.split(" ") ], {
            cwd: process.cwd()
        });
    }
    let schema = opts.schema;
    if( !schema ) {
        schema = prisma.find( value => {
            return fs.existsSync( value );
        })
    }
    if( !schema ) {
        return console.error( "Migrate error: schema.prisma file not found!" );
    }

    console.log(`PSM migrate base do schema ${schema}`);

    const home = Path.dirname( schema );
    const psm_yml = Path.join( home, "psm.yml" );
    const psm_sql = Path.join( home, "psm.sql");
    if( !fs.existsSync( psm_yml ) ) {
        return console.error( "Migrate error: psm.yml file not found!" );
    }
    if( !fs.existsSync( psm_sql ) ) {
        return console.error( "Migrate error: psm.sql file not found!" );
    }

    console.log(`PSM migrate using ${psm_yml}`);
    const psm = yaml.parse( fs.readFileSync( psm_yml ).toString() ) as PSMConfigFile;
    const next = Path.join( psm.psm.output, "next/migration.next.sql");
    const check = Path.join( psm.psm.output, "next/migration.next.check.sql");

    if( !fs.existsSync( check) ) {
        return console.error( "Migrate error: next/migration.next.check.sql file not found!" );
    }
    if( !fs.existsSync( next) ) {
        return console.error(  "Migrate error: next/migration.next.sql file not found!" );
    }


    const driver = await import( psm.psm.driver ) as PSMDriver;
    const migrator = driver.migrator({
        url: process.env[psm.psm.url],
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
        return console.error( "Migrate error: Core failed!" );
    }

    result = await migrator.test();
    if( !result.success ) {
        console.error( result.error );
        result.messages.forEach( error => {
            console.error( error );
        });
        return console.error( "Migrate error: Check shadow failed!" );
    }


    result = await migrator.migrate();
    if( !result.success ) {
        console.error( result.error );
        result.messages.forEach( error => {
            console.error( error );
        });
        return console.error( "Migrate error: Commit migration failed!" );
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