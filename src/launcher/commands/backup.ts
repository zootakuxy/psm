import {CommandModule} from "yargs";
import {backup, BackupOptions} from "../../tools/backup";

const command:CommandModule<BackupOptions, BackupOptions> = {
    command: "backup",
    describe: "Backup current database",
    builder: args => {
        args.options( "schema", {
            type: "string",
            alias: "s"
        }).options( "add", {
            type: "boolean",
            describe: "Adicionar no git"
        }).options( "label", {
            type: "string",
            alias: "l",
        })

        return args;
    },
    handler:( argv) =>{
        backup(argv).then(value =>  {
            console.log( "Commited!")
        }).catch( reason => {
            console.error( reason)
        })
    }
}

export = command;

