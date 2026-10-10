import { readFileSync } from "node:fs" // is  a tool  that reads a  file from your hard drive 'SYNC" mean the program wiats until the whole file is read before moving on 
import { z } from "zod"

const scenarioSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    level: z.enum(["foundation", "intermediate", "senior"]),
    trigger: z.string(),
    strongAnswerCovers: z.array(z.string()).min(1),
    weakSigns: z.array(z.string()).min(1),
    expectedDiagramChange: z.array(z.string()),
    followUps: z.array(z.string()),
})

const roleSchema = z.object({
    description: z.string(),
    scenarios: z.array(scenarioSchema).min(1),
})

const fileSchema = z
    .object({
        schemaVersion: z.literal(1),
        interviewerRules: z.array(z.string()),
        roles: z.record(z.string(), roleSchema),
        system: z.object({
            description: z.string(),
            scenarios: z.array(scenarioSchema).min(1),
        }),
    }) // .refine mean after normal check pass also run my own check  data is the whole file after it apssed the normal checks 
    .refine((data) => "generic" in data.roles, {  // is there a role named  called generic inside roles ? it gives true or false 
        message: "roles must include a 'generic' role",
    })

const filePath = new URL("../data/designreview-scenarios.json", import.meta.url)  // import.meta.url is the fle ur in rn scenario.ts      take two files and combine the two into one full address the result is tsored in  filepath

export const library = fileSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")))  // opens the file and returns its content as plain text  utf8 convert it into text  JSON.PARSE TURN STHAT TEXT INTO REAL JS OBJECT THAT CODE CAN WORK WITH LATER like libarry.roles or libarray.scenarios   and fileSchema.parse   runs teh whole checklist on taht object it returns the object if it passes and crashes the startup with an error if it doenst

export type Scenario = z.infer<typeof scenarioSchema>
//  later we will write functions like "pick a  scenario fo rthis box" TO write one yu must tell typescript whta a scenario looks like WITHOUT this you woould write it again in evry file by hand
//  STEP BY STEP 
//  make a type called scenario and let others file use it 
// z.infer is a  zod tool that means "look at this checklist and work out what a correctly checked item looks like 
// in simple MAKE A TYPE CALLED SCENARIO AND SHAPED LIKE WHATEVRR PASSES   (scenarioSchema )
// what it give su in practice say later  a file has this 

//          function describe(s : Scenario ) {
//              return s.titel
//}
//       your editor underlines titel in red and says it doenst exist on Scenario. YOU catch the typo before you run anything an dif u type s. it will suggest id, title , level, and others mention in  (scenarioSchema)
// 
// "