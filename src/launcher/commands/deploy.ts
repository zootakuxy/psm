import {CommandModule} from "yargs";
import { DeployOptions, deploy} from "../../tools/deploy";


const command:CommandModule<DeployOptions, DeployOptions> = {
    command: "deploy",
    describe: "Deploy all commited revision into server",
    builder: args => {
        args.options( "schema", {
            type: "string",
            alias: "s"
        })
        return args;
    },
    handler:( argv) =>{
        deploy( argv ).then( value => {
        }).catch( reason => {
            console.error( reason );
        })
    }
}

export = command;

