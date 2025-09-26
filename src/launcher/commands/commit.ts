import {CommandModule} from "yargs";
import {commit, MigrateOptions} from "../../tools/commit";


const command:CommandModule<MigrateOptions, MigrateOptions> = {
    command: "commit",
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
        commit(argv).then( value => {
            console.log("Operation finished with success!")
        }).catch( reason => {
            console.error( "Operation finished with error!");
            console.error( reason );
        })
    }
}

export = command;

