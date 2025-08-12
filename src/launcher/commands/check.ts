import {CommandModule} from "yargs";
import {migrate} from "../../tools/migrate";
import {check} from "../../tools/check";


const command:CommandModule = {
    command: "check",
    builder: args => {
        return args;
    },
    handler: args => {
        check();
    }
}

export = command;

