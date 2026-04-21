export { loadSkillMetadata, loadSkillContent, buildSkillsContext, invalidateSkillCache } from './loader.js'
export { checkAndImprove } from './improver.js'

import { loadSkillMetadata, loadSkillContent } from './loader.js'
import chalk from 'chalk'

export async function listSkillsFormatted(): Promise<string> {
  const skills = await loadSkillMetadata()
  if (skills.length === 0) {
    return chalk.gray('No skills found. Skills are created automatically after complex tasks.')
  }

  const lines = [chalk.bold('\nAvailable Skills\n')]
  for (const skill of skills) {
    lines.push(`  ${chalk.cyan(skill.id.padEnd(35))}${skill.name}`)
  }
  lines.push('')
  lines.push(`Use ${chalk.cyan('seabri skills show <id>')} to view a skill in full.`)
  lines.push(`Use ${chalk.cyan('seabri skills create <name>')} to scaffold a new skill.`)
  lines.push('')
  return lines.join('\n')
}

export async function showSkill(skillId: string): Promise<string | null> {
  return loadSkillContent(skillId)
}
