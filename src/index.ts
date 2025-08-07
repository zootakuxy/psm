import { GeneratorOptions } from '@prisma/generator-helper'
import { generatorHandler, GeneratorManifest } from '@prisma/generator-helper'

import * as fs from 'fs'
import {extractModels} from "./extractor";
import * as Path from "node:path";
import {customRandom, random} from "nanoid";
import {
    PSMDriver,
    ModelOptions,
    PSMField,
    PSMModel,
    PSMParserOptions,
    DriverConfigs,
    PSMMigrationResult
} from "./driver";
import {parsePsmDoc} from "./docs";
import * as JSON5 from "json5";
import * as process from "node:process";
export * from "./driver"

function write( sql:string, dirname:string, file:string){
    fs.writeFileSync( Path.join( dirname, file ), sql );
}

generatorHandler({
    onManifest(): GeneratorManifest {
        return {
            version: '1.0.0',
            defaultOutput: './psm',
            prettyName: 'PSM - Prisma Safe Migration',
        }
    },

    async onGenerate(options: GeneratorOptions) {
        try{

        const home = options.generator.output?.value || "./psm";
        const definition = Path.join( home, "definitions");
        const revisions = Path.join( home, "revisions");
        const next = Path.join( home, "next");

        fs.mkdirSync( definition, { recursive: true });
        fs.mkdirSync( revisions, { recursive: true });
        fs.mkdirSync( next, { recursive: true });
        const { datamodels, models, enums, schema } = extractModels( options, definition );


        let rand = customRandom( "abcdefghijklmnopqrstuvwxyz0123456789",8, random);
        const migration = rand();
        const configs:DriverConfigs = options.generator.config as any;
        const url = process.env[configs.url] as string;

        const driver = await import( configs.driver ) as PSMDriver;


        let usePrepare= ( model:ModelOptions )=>{
            return Promise.resolve( driver.prepare( model ) )
        }

        for (let i = 0; i < models.length; i++) {
            const model = models[i] as any as ModelOptions;
            model.model = model.name;
            model.name = model.dbName||model.model;

            if( !!model.documentation ){
                model.psm = parsePsmDoc<PSMModel>( model.documentation );
            }
            model.fields.forEach( field => {
                if( !!field.documentation ) field.psm = parsePsmDoc<PSMField>( field.documentation );
            });
            await usePrepare(model);
        }



        const opts: PSMParserOptions = {
            models: models as any,
            indexes: datamodels.indexes,
            migration: migration,
            shadow: `psm_shadow_${rand()}`,
            backup: "backup",
            sys: "sys",
        };

        const generator = driver.generator(opts);

        const check = generator.check();
        const migrate = generator.migrate();

        write( check, next, "migration.next.check.sql" );


        let test:PSMMigrationResult|undefined;

        if( !!url ) {
            test = await driver.migrator({
                migrate: migrate,
                check: check,
                url: url as string
            }).test();
        }

        if( !configs.url ){
            write( migrate, next, "migration.next.sql" );
        } else if( !!test && test.success ) {
            write( migrate, next, "migration.next.sql" );
        } else {
            console.error( `TEST OF MIGRATION FAILED! Check file migration.next.check.sql` );
            if( !!test?.messages?.length ){
                console.log("TESTE MESSAGES>>>>>>>>>>");
                test.messages.forEach(value => {
                    console.log( value)
                });
            }

            if( !!test?.error ){
                console.log("TESTE ERROR>>>>>>>>>>");
                console.error( test?.error );
            }
        }

        write( JSON5.stringify({
            migration: migration,
            driver: options.generator.config.driver,
            test: {
                check: !!test? "checked": "skipped",
                success: test?.success,
                messages: test?.messages
            }
        }, null, 2), next, "migration.json5" )
        } catch (e){
            console.error( "console.error", e );
            throw e
        }
    },
})




// const raw = `
// @psm.view
// @psm.backup.skip
// @psm.backup.clean
// @psm.backup.lists.list1 += 8383
// @psm.backup.lists.list1 += 8383
// @psm.backup.lists.list1 += 8383
// @psm.type = view
// @psm.view
// @psm.view2 = true
// @psm.view3 = false
// @psm.description = <<<EOF
// Texto descritivo
// que ocupa várias linhas
// e pode ter qualquer coisa dentro.
// EOF
// @psm.multline_docs = Line1
// @psm.multline_docs = Line2
// @psm.multline_docs = Line3
// @psm.array += Line1
// @psm.array += Line2
// @psm.array += Line3
// @psm.array += ["Line4"]
// @psm.array += {i:"line5"}
// @psm.array_idx[2] = {i:"Array index 2"}
// @psm.childObject = {type:"Type", usr:"User"}
// @psm.childObject2 = { "type":"Type", name:"Object2"}
// `
// console.log( JSON.stringify( parsePsmDoc(raw), null, 2) );


