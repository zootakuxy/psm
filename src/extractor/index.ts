import { GeneratorOptions } from '@prisma/generator-helper'
import * as fs from 'fs'

export function extractModels(options: GeneratorOptions, dirname:string) {

    const {datamodel, schema} = options.dmmf
    const {models, enums, ...extras} = datamodel;
    fs.writeFileSync( dirname+"/models.json", JSON.stringify( models, null, 2) )
    fs.writeFileSync( dirname+"/enums.json", JSON.stringify( enums, null, 2) )
    fs.writeFileSync( dirname+"/datamodel.json", JSON.stringify( extras, null, 2) )
    fs.writeFileSync( dirname+"/schema.json", JSON.stringify( schema, null, 2) )

    return {
        models,
        enums,
        datamodels:extras as any,
        schema
    }
}
