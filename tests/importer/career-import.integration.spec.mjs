import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Inject SYSTEM mock early
// Mock complet pour intégration (arcana incluse + nouvelles compétences)
globalThis.SYSTEM = {
  SKILLS: {
    athletics: { id: 'athletics' },
    awareness: { id: 'awareness' },
    coordination: { id: 'coordination' },
    perception: { id: 'perception' },
    deception: { id: 'deception' },
    science: { id: 'science' },
    stealth: { id: 'stealth' },
    arcana: { id: 'arcana' },
    computers: { id: 'computers' },
    skulduggery: { id: 'skulduggery' },
  },
}

import { careerMapper } from '../../module/importer/items/career-ogg-dude.mjs'

function parseCareerXml(xml) {
  // Parsing simpliste suffisant pour tests (pas besoin d'un vrai parser XML complet)
  // Hypothèse: structure <Career><Name>..</Name><Key>..</Key>...</Career>
  const getTag = (tag) => {
    // Pattern multi-lignes simple: remplacer [\s\S] (tout) par [\d\D] pour éviter règle lint sur \s.
    // Pattern simple multi-lignes: utiliser [^] (tout caractère) version non-gourmande
    const pattern = new RegExp(`<${tag}>([^]*?)</${tag}>`)
    const match = pattern.exec(xml)
    return match ? match[1].trim() : undefined
  }
  const skillMatches = [...xml.matchAll(/<CareerSkill>\s*<Key>(.*?)<\/Key>\s*<\/CareerSkill>/g)]
  const careerSkillKeys = skillMatches.map((m) => ({ Key: m[1].trim() }))
  return {
    Name: getTag('Name'),
    Key: getTag('Key'),
    Description: getTag('Description'),
    FreeRanks: getTag('FreeRanks'),
    CareerSkills: { CareerSkill: careerSkillKeys },
  }
}

describe('Intégration import carrières XML', () => {
  const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures/Careers')
  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.xml'))
  const careersRaw = files.map((f) => parseCareerXml(fs.readFileSync(path.join(fixturesDir, f), 'utf-8')))

  it('importe toutes les carrières en mode non strict', () => {
    const mapped = careerMapper(careersRaw)
    expect(mapped.length).toBe(careersRaw.length)
    const keys = mapped.map((m) => m.flags?.swerpg?.oggdudeKey)
    expect(keys).toContain('soldier')
    expect(keys).toContain('spy')
    expect(keys).toContain('scholar')
    const soldier = mapped.find((c) => c.flags?.swerpg?.oggdudeKey === 'soldier')
    const spy = mapped.find((c) => c.flags?.swerpg?.oggdudeKey === 'spy')
    const scholar = mapped.find((c) => c.flags?.swerpg?.oggdudeKey === 'scholar')
    expect(soldier).toBeDefined()
    expect(spy).toBeDefined()
    expect(scholar).toBeDefined()
    // Order is not significant; compare as sorted arrays to avoid brittle ordering assumptions
    expect(soldier.system.careerSkills.map((s) => s.id).sort()).toEqual(['athletics', 'deception', 'perception'].sort())
    expect(spy.system.careerSkills.map((s) => s.id).sort()).toEqual(['athletics', 'perception'].sort())
    expect(scholar.system.careerSkills.map((s) => s.id).sort()).toEqual(['science', 'arcana', 'athletics'].sort())
  })

  it('filtre correctement en mode strict', () => {
    const mappedStrict = careerMapper(careersRaw, { strictSkills: true })
    const scholarStrict = mappedStrict.find((c) => c.flags?.swerpg?.oggdudeKey === 'scholar')
    const spyStrict = mappedStrict.find((c) => c.flags?.swerpg?.oggdudeKey === 'spy')
    expect(scholarStrict).toBeDefined()
    expect(spyStrict).toBeDefined()
    // arcana est dans le registre strict donc conservée
    expect(scholarStrict.system.careerSkills.map((s) => s.id).sort()).toEqual(['science', 'arcana', 'athletics'].sort())
    expect(spyStrict.system.careerSkills.map((s) => s.id).sort()).toEqual(['athletics', 'perception'].sort())
  })

  it('ne génère aucun id falsy', () => {
    const mapped = careerMapper(careersRaw)
    const falsy = mapped.flatMap((c) => c.system.careerSkills.filter((s) => !s.id))
    expect(falsy).toEqual([])
  })
})
