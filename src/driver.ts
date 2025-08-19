export interface PSMField {
    comment?:string
    restore?: {
        expression?:string
    }
}


export interface UniqueOptions {
    name:string,
    fields:string[]
    indexes:[]
}

export interface IndexOptions {
    model:string,
    type:"id"|"unique"|"normal"
    name?:string
    dbName?:string
    isDefinedOnField?:boolean
    algorithm:string
    fields: ({ name:string })[]
}
export interface FieldOption {
    "name": string
    documentation?: string
    psm?: PSMField
    dbName?: string
    "kind": "scalar"|"object"
    "isList": boolean,
    "isRequired": boolean,
    "isUnique": boolean,
    "isId": boolean,
    "isReadOnly": boolean,
    "hasDefaultValue": boolean,
    "type": string,
    "isGenerated": boolean,
    "isUpdatedAt": boolean,
    relationName?:string
    relationFromFields?:string[]
    relationToFields?:string[]
    "default"?: {
        "name": string,
        "args": []
    },
    "nativeType"?: [
        string,
        [
            "6"
        ]
    ],
}

export interface PSMParserOptions {
    models:ModelOptions[]
    indexes:IndexOptions[]
    backup:string
    sys:string
    migration:string
    shadow:string
}

export interface PSMModel {
    view?:boolean
    query?:{
        [p:string]:string
    }
    backup?:{
        skip?:boolean
        clean?:boolean,
        rev?:{
            version?:string
            apply?:"ALWAYS"|"WHEN"|"WHEN_EXCEPTION",
            from?: "query"|"query:linked"|"relation"|"model"
            expression?:string
            exists?:string
            when?:string
        }
    }
    comment?:string
}

export interface ModelOptions {
    name:string,
    model:string,
    index:number
    documentation?:string,
    psm?:PSMModel,
    dbName?:string,
    schema:string,
    temp:string,
    fields:FieldOption[]
    primaryKey:FieldOption[]
    uniqueFields:string[][]
    uniqueIndexes:UniqueOptions[]
    isGenerated:FieldOption[]
    indexes:IndexOptions[]
}

export interface MigrationOptions {
    sql:string
    url:string,
    label:string
}


export interface PSMMigrationOptions {
    check:string,
    core:string,
    url:string,
    migrate:string
}

export interface Migrated {
    sid:string,
    date: Date
}

export interface PSMMigratedOptions {
    url:string,
    sys:string
}

export interface PSMMigrationResult {
    success?:boolean
    messages?:string[]
    error?:any
}


export interface PSMGenerator {
    migrate():string,
    check():string,
    core():string,
}

export interface PSMMigrated {
    messages:string[]
    error?:any
    success?:boolean
    migrated?:Migrated[]
}

export interface PSMMigrator {
    core():Promise<PSMMigrationResult>,
    test():Promise<PSMMigrationResult>,
    migrate():Promise<PSMMigrationResult>,
}
export interface PSMDriver {
    migrated:( opts:PSMMigratedOptions )=>Promise<PSMMigrated>,
    generator:( opts:PSMParserOptions )=>PSMGenerator,
    migrator:( opts:PSMMigrationOptions ) =>PSMMigrator,
    prepare: ( model:ModelOptions )=>Promise<any>|void
}

export interface DriverConfigs {
    driver:string,
    url:string,
    sys:string,
}

