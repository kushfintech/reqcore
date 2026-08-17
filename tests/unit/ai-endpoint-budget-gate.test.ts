/**
 * Structural guard over the money-safety layer.
 *
 * Five AI endpoints shipped at once without a budget gate, because the gate is
 * something you have to remember to add rather than something the code makes you
 * do. An ungated endpoint is unlimited platform spend for any authenticated
 * session, and an unrecorded one is spend the global daily kill-switch cannot
 * see — the cap that is supposed to cover every surface.
 *
 * So this test enumerates the surfaces instead of trusting a list: any endpoint
 * that resolves a platform-capable provider must gate before the model call and
 * record after it. A new one fails here on the day it is written.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const apiRoot = resolve(process.cwd(), 'server/api')

function apiFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return apiFiles(path)
    return entry.name.endsWith('.ts') ? [path] : []
  })
}

/** Endpoints that can bill the platform key, i.e. everything the gate must cover. */
function platformSpendingEndpoints(): { path: string, source: string }[] {
  return apiFiles(apiRoot)
    .map(path => ({ path: relative(process.cwd(), path), source: readFileSync(path, 'utf8') }))
    .filter(file => /resolve(Analysis|Chatbot)Provider\(/.test(file.source))
}

describe('platform-paid AI endpoints', () => {
  it('finds the AI endpoints to check', () => {
    // Guards the guard: a rename that empties the list must not read as a pass.
    expect(platformSpendingEndpoints().length).toBeGreaterThanOrEqual(8)
  })

  it.each(platformSpendingEndpoints())('$path gates spend before calling the model', ({ source }) => {
    // The assistant has its own allowance gate (credits, not dollars); analysis
    // and one-shot generations share assertPlatformBudget.
    expect(source).toMatch(/assertPlatformBudgetForRequest\(|assertChatbotAllowance\(/)
  })

  it.each(platformSpendingEndpoints())('$path records what it spent', ({ source }) => {
    // Either ledger is fine — analysis runs write their own row on analysisRun,
    // one-shot generations and assistant turns write aiUsageEvent.
    expect(source).toMatch(/recordAiGeneration\(|reserveChatbotUsage\(|analysisRun\)/)
  })
})

describe('the AI spend ledger', () => {
  it('has a feature value for every one-shot generation that records usage', () => {
    const schema = readFileSync(resolve(process.cwd(), 'server/database/schema/app.ts'), 'utf8')
    const enumValues = schema.match(/aiUsageFeatureEnum = pgEnum\('ai_usage_feature', \[([^\]]+)\]/)?.[1] ?? ''

    // Only the one-shot ledger writers: analysis runs and assistant turns name
    // their feature for PostHog alone, and are metered elsewhere.
    const recorded = new Set(
      platformSpendingEndpoints()
        .filter(file => file.source.includes('recordAiGeneration('))
        .flatMap(file => [...file.source.matchAll(/feature: '([a-z_]+)'/g)])
        .map(match => match[1]!),
    )

    expect(recorded.size).toBeGreaterThan(0)
    for (const feature of recorded) {
      expect(enumValues).toContain(`'${feature}'`)
    }
  })
})
