import {CommandModule} from "yargs";
import {generate} from "../../tools/generate";


const command:CommandModule = {
    command: "generate",
    describe: "Generate pre-migrate archives",
    builder: args => {
        return args;
    },
    handler: args => {
        generate();
    }
}

export = command;

