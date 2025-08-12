import {CommandModule} from "yargs";
import {migrate, MigrateOptions} from "../../tools/migrate";


const command:CommandModule<MigrateOptions, MigrateOptions> = {
    command: "migrate commit",
    describe: "Migrate next schema structure into dev environment",
    builder: args => {
        args.options( "schema", {
            type: "string",
            alias: "s"
        }).options("generate", {
            type: "boolean",
            alias: "g",
        }).options( "label", {
            type: "string",
            alias: "l",

        }).options( "generate-command", {
            type: "string",
            alias: "c"
        })

        return args;
    },
    handler:( argv) =>{
        console.log( argv )
        // migrate(argv).then( value =>  {
        // }).catch( reason => {
        // })
    }
}

export = command;

