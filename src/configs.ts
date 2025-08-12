export interface PSMConfigFile {
    psm: {
        migration: string
        driver: string
        url: string
        output: string
        schema: string
    },
    test: {
        check: "checked"|"skipped",
        success: boolean,
        messages: string[]
    },
    migration?: {
        instate: string,
        preview: string,
        label: string,
    }
}