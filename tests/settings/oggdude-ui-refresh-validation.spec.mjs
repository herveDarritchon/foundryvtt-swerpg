import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('OggDudeDataImporter UI Refresh Code', () => {
  it('should have render() calls after processOggDudeData in loadAction', () => {
    const filePath = join(process.cwd(), 'module/settings/OggDudeDataImporter.mjs')
    const content = readFileSync(filePath, 'utf-8')
    
    // Vérifier que loadAction contient un render() après processOggDudeData
    const loadActionMatch = content.match(/static async loadAction[\s\S]*?await OggDudeImporter\.processOggDudeData[\s\S]*?}\s*\n[\s\S]*?render\(\)/)
    expect(loadActionMatch).toBeTruthy()
    
    // Vérifier la présence du log de debug
    expect(content).toContain('UI refreshed after import completion')
  })

  it('should have render() calls after processOggDudeData in _onSubmit', () => {
    const filePath = join(process.cwd(), 'module/settings/OggDudeDataImporter.mjs')
    const content = readFileSync(filePath, 'utf-8')
    
    // Vérifier que _onSubmit contient un render() après processOggDudeData
    const onSubmitMatch = content.match(/await OggDudeImporter\.processOggDudeData[\s\S]*?}\s*\)[\s\S]*?render\(\)/)
    expect(onSubmitMatch).toBeTruthy()
    
    // Vérifier la présence du log de debug spécifique au bouton
    expect(content).toContain('UI refreshed after import completion (button)')
  })

  it('should handle render errors gracefully', () => {
    const filePath = join(process.cwd(), 'module/settings/OggDudeDataImporter.mjs')
    const content = readFileSync(filePath, 'utf-8')
    
    // Vérifier que les erreurs de render sont gérées
    expect(content).toContain('render after import error')
    expect(content).toContain('try {')
    expect(content).toContain('} catch (e) {')
  })
})