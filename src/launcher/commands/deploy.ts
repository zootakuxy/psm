import {CommandModule} from "yargs";
import {DeployOptions} from "../../tools/deploy";


const command:CommandModule<DeployOptions, DeployOptions> = {
    command: "migrate deploy",
    describe: "Deploy to production environment",
    builder: args => {
        return args;
    },
    handler:( argv) =>{
        console.log( "TODO - psm migrate deploy ainda não esta implementado")
    }
}

export = command;

