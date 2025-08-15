import * as fs from "node:fs";
import * as yaml from "yaml";
import * as Path from "node:path";
import {PSMConfigFile} from "../configs";
import chalk from "chalk";
import {PSMDriver} from "../driver";

export interface DeployOptions {
    schema?:string
    generate?:string
    label?:string
    "generate-command":string
}
const prisma = [
    `${process.cwd()}/schema.prisma`,
    `${process.cwd()}/prisma/schema.prisma`,
];

const TAG = "PSM DEPLOY >"

export async function deploy( opts: DeployOptions) {
    console.log("Sdsd sd sdsdsds")
    require('dotenv').config();
    let schema = opts.schema;
    if( !schema ) {
        schema = prisma.find( value => {
            return fs.existsSync( value );
        })
    }
    if( !schema ) {
        return console.error( "Migrate error: schema.prisma file not found!" );
    }
    console.log(`PSM deploy base do schema ${schema}`);

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
    const driver = await import( psm.psm.driver ) as PSMDriver;
    let migrator = driver.migrator({
        url: process.env[psm.psm.url],
        migrate: "",
        check: "",
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


    const revisions = Path.join( home, `psm/revisions/schema`);
    let revs = fs.readdirSync( revisions )
        .filter( n => fs.statSync( Path.join( revisions, n)).isDirectory() )
        .map( n => {
            let psm = yaml.parse( fs.readFileSync( Path.join( revisions, n, "psm.yml") ).toString() ) as PSMConfigFile

            let migrate = fs.readFileSync( Path.join( revisions, n, "migration.sql") ).toString()
            return {
                psm,
                migrate
            }
        });

    if( !revs.length ){
        console.log( TAG, "No migrate commited!" );
        console.log( TAG, `Use ${ chalk.bold("psm migrate commit")} first!` );
        return;
    }

    const missingPreview = revs.filter( (n, i) => {
        return (!!n.psm.migration.preview && !revs.find( p => p.psm.migration.revision === n.psm.migration.preview))
            || ( i > 0 && !n.psm.migration.preview)
    });

    if( !!missingPreview.length){
        const missings = missingPreview.map( n=> `${n.psm.psm.migration} - ${n.psm.migration.label} at ${n.psm.migration.instate}`  );
        console.log( `MISSING PREVIEW migration for...\n`, missings.join("\n"));
        return;
    }


    let migrated = await driver.migrated({
        url: process.env[psm.psm.url],
        sys: psm.psm.sys
    });

    if( !migrated.success ) {
        console.error( migrated.error );
        migrated.messages.forEach( error => {
            console.error( error );
        });
        return console.error( "Load Migrated failed!" );
    }

    for (let i = 0; i < revs.length; i++) {
        let next = revs[i];
        let pl = !!next.psm.migration.label?.length ? ` - ${next.psm.migration.label} `: " "
        let label = `RevNo ${ chalk.bold(next.psm.migration.revision)}${pl}commited at ${next.psm.migration.instate}`;
        const mig  = migrated.migrated.find( value => value.sid === next.psm.psm.migration );

        if( !!mig ) {
            console.log( `${label} is migrated at ${mig.date}` );
            continue;
        }
        const migrator = driver.migrator({
            url: process.env[next.psm.psm.url],
            migrate: next.migrate,
            check: "",
            core: "",
        });

        const result = await migrator.migrate();

        if( !result.success ) {
            console.error( result.error );
            result.messages.forEach( error => {
                console.error( error );
            });
            console.error( "Migrate error: Push migration failed!" );
            console.log( `${label} is migrated at ${mig.date} - ${chalk.redBright.bold( "FAILED")}` );
            return;
        }
        console.log( `${label} is migrated at ${mig.date} - ${chalk.greenBright.bold( "SUCCESS")}` );

    }
}