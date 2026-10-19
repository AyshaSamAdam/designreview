
// MAIN PURPOSE OF THIS FILE GIVEN's A BOX (KIND) CHOOSE ONE SCENARIO FROM THE LIBRARY 

import { library, type Scenario } from "./scenarios.js"

export type Box = { kind?: string; label?: string; note?: string }

const LEVELS = ["foundation", "intermediate", "senior"] as const
type Level = (typeof LEVELS)[number]

function roleFor(box: Box): string {
    const kind = box.kind
    if (typeof kind === "string" && Object.prototype.hasOwnProperty.call(library.roles, kind)) {
        return kind
    }
    return "generic"
}
                                                                                // = {} means if nobody gives me options treat it as an empty set of options  and defaults are apply    the funstion either returns Scenario or null 
export function pickScenario( box: Box, options: { level?: Level; asked?: string[] } = {}): Scenario | null {
    const role = roleFor(box)
    const asked = new Set(options.asked ?? [])
    const target = LEVELS.indexOf(options.level ?? "foundation")

    const candidates = library.roles[role].scenarios
        .filter((scenario) => !asked.has(scenario.id))  // keep only the scenarios whose id is not in asked 
        .map((scenario) => ({
            scenario,
            distance: Math.abs(LEVELS.indexOf(scenario.level) - target),
        }))
        .sort((a, b) => a.distance - b.distance)

    const closest = candidates.filter((c) => c.distance === candidates[0]?.distance)
    return closest[Math.floor(Math.random() * closest.length)]?.scenario ?? null
}