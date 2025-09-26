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
            console.log("Operation finished with success!")
        }).catch( reason => {
            console.error( "Operation finished with error!");
            console.error( reason );
        })
    }
}

export = command;

