import { describe, expect, it } from 'vitest'
import {
  containsAutomationSensitiveTerms,
  containsProtectedTraitTerms,
} from '../../server/utils/ai/sensitiveTerms'

describe('protected-trait terms', () => {
  // One protected trait per shipped locale, in the wording a generated or
  // imported question would actually use. An English-only gate passed all of
  // these through to rules that can auto-reject an applicant.
  it.each([
    ['en', 'What is your date of birth?'],
    ['de', 'Wie lautet Ihr Geburtsdatum?'],
    ['de', 'Bitte geben Sie Ihr Alter an.'],
    ['de', 'Welche Staatsangehörigkeit haben Sie?'],
    ['es', '¿Cuál es su estado civil?'],
    ['es', '¿Tiene alguna discapacidad?'],
    ['fr', 'Quel est votre âge ?'],
    ['fr', 'Quelle est votre situation familiale ?'],
    ['nb', 'Hva er fødselsdatoen din?'],
    ['nb', 'Har du barn?'],
    ['nb', 'Hva er statsborgerskapet ditt?'],
    ['vi', 'Bạn bao nhiêu tuổi?'],
    ['vi', 'Tôn giáo của bạn là gì?'],
    ['vi', 'Tình trạng hôn nhân của bạn?'],
  ])('flags a sensitive inquiry written in %s: %s', (_locale, label) => {
    expect(containsProtectedTraitTerms(label)).toBe(true)
  })

  it.each([
    ['en', 'How many years of PostgreSQL experience do you have?'],
    ['de', 'Beschreiben Sie ein Projekt, das Sie geleitet haben.'],
    ['de', 'Welche Alternative zu Kubernetes haben Sie eingesetzt?'],
    ['es', '¿Qué herramientas de diseño has utilizado?'],
    ['fr', 'Décrivez une situation difficile avec un client.'],
    ['fr', 'Quel genre de projets avez-vous menés ?'],
    ['nb', 'Hvilke verktøy har du brukt i produksjon?'],
    ['vi', 'Bạn có kinh nghiệm với PostgreSQL không?'],
  ])('keeps a role-related question written in %s: %s', (_locale, label) => {
    expect(containsProtectedTraitTerms(label)).toBe(false)
  })

  it('matches regardless of accent composition or apostrophe style', () => {
    // The same words arrive NFC-composed from one client and decomposed from
    // another; a gate that only handles one form is not a gate.
    expect(containsProtectedTraitTerms('Quel est votre âge ?'.normalize('NFD'))).toBe(true)
    expect(containsProtectedTraitTerms('Bạn bao nhiêu tuổi?'.normalize('NFD'))).toBe(true)
    expect(containsProtectedTraitTerms('What is your partner’s name?')).toBe(true)
  })

  it('matches whole words only, including across non-ASCII letters', () => {
    expect(containsProtectedTraitTerms('Which alternative did you choose?')).toBe(false)
    expect(containsProtectedTraitTerms('Hvilken fødselsdatoformattering?')).toBe(false)
  })

  it('follows German and Norwegian inflection without swallowing the next compound element', () => {
    expect(containsProtectedTraitTerms('Haben Sie Behinderungen?')).toBe(true)
    expect(containsProtectedTraitTerms('Er sykdommen kronisk?')).toBe(true)
    // "barn" is a listed term; a kindergarten is a workplace, not a trait.
    expect(containsProtectedTraitTerms('Hvilken erfaring har du fra barnehage?')).toBe(false)
    expect(containsProtectedTraitTerms('Beschreiben Sie Ihre Erfahrung mit Kundenbetreuung.')).toBe(false)
  })
})

describe('automation-eligibility terms', () => {
  // Deliberately wider than the generator's filter: excluding a question here
  // only costs an automation candidate, while including one costs an applicant
  // an automatic rejection on a protected trait.
  it.each([
    ['en', 'Do you have a valid visa?'],
    ['de', 'Sind Sie in einer Gewerkschaft?'],
    ['de', 'Haben Sie den Wehrdienst geleistet?'],
    ['es', '¿Cuál es su afiliación política?'],
    ['fr', 'Quel est votre état de santé ?'],
    ['nb', 'Har du helseutfordringer?'],
    ['vi', 'Bạn đã hoàn thành nghĩa vụ quân sự chưa?'],
  ])('blocks automation on a sensitive %s question: %s', (_locale, label) => {
    expect(containsAutomationSensitiveTerms(label)).toBe(true)
  })

  it('reaches broad terms inside German and Norwegian compounds', () => {
    expect(containsAutomationSensitiveTerms('Gesundheitsdaten')).toBe(true)
    expect(containsAutomationSensitiveTerms('Har du helseutfordringer?')).toBe(true)
    // Compound matching is why "Ehe" is not a broad term: this is a normal
    // question about a former employer.
    expect(containsAutomationSensitiveTerms('Nennen Sie Ihren ehemaligen Arbeitgeber.')).toBe(false)
  })

  it('still allows objective, job-related questions in every locale', () => {
    for (const label of [
      'Do you hold a valid forklift licence?',
      'Haben Sie einen gültigen Führerschein?',
      '¿Tienes el certificado requerido?',
      'Possédez-vous le permis requis ?',
      'Har du fagbrev som elektriker?',
      'Bạn có chứng chỉ bắt buộc không?',
    ]) {
      expect(containsAutomationSensitiveTerms(label)).toBe(false)
    }
  })
})
