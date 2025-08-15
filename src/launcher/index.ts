#!/usr/bin/env node
require("source-map-support").install();
import * as Path from "node:path";
import yargs from "yargs";

let ss = yargs(process.argv.slice(2))
    //language=file-reference
    .commandDir(Path.join( __dirname, "./commands" ) )
    .demandCommand()
    .help()
    .argv;
