import {CommandModule} from "yargs";
import {commit} from "../../tools/commit";
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

