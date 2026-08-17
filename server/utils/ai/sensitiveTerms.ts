/**
 * Keyword dictionary for questions that request protected or otherwise
 * sensitive personal information, in every language the product ships.
 *
 * The model prompt is the first guardrail; these terms are the
 * non-probabilistic gate behind it, and the last one before a question can be
 * used by a rule that automatically rejects an applicant. Generated questions
 * are written in the language of the job description and imported questions
 * keep the recruiter's wording verbatim, so an English-only gate lets "Alter",
 * "Staatsangehörigkeit" and "fødselsdato" through untouched. Terms therefore
 * cover all six UI locales and are matched in all of them at once: knowing
 * which language a question is in would require a second probabilistic step,
 * which is exactly what this gate exists to sit behind.
 *
 * Entries are literal text rather than regular expressions so the list stays
 * reviewable by anyone auditing the compliance behaviour. That means inflected
 * forms are spelled out; a term that only appears inside a compound (German
 * "Lebensalter", Norwegian "fødselsår") needs its own entry.
 *
 * Matching in six languages simultaneously produces occasional cross-language
 * false positives — English "alter" collides with German "Alter", Norwegian
 * "gift" and "skilt" have unrelated English meanings. That is the intended
 * direction of error: a recruiter can add a narrowly job-related question back,
 * while a protected-trait question that slips through reaches applicants.
 * Terms whose everyday meaning would misfire constantly are deliberately
 * omitted in favour of a phrase — French "genre" and Spanish "género" also mean
 * "kind of", Spanish "fotografía" is also the profession — so only
 * "identité de genre", "identidad de género" and "foto personal" are listed.
 */

export type SensitiveTermLocale = 'en' | 'de' | 'es' | 'fr' | 'nb' | 'vi'

type TermsByLocale = Record<SensitiveTermLocale, string[]>

type ProtectedTraitCategory =
  | 'age'
  | 'originAndRace'
  | 'citizenshipAndImmigration'
  | 'sexAndGender'
  | 'familyAndCaregiving'
  | 'religionAndBelief'
  | 'healthAndDisability'
  | 'backgroundAndAffiliation'
  | 'personalDataRequests'

const PROTECTED_TRAIT_TERMS: Record<ProtectedTraitCategory, TermsByLocale> = {
  // Age and information commonly used to infer it.
  age: {
    en: ['age', 'aged', 'years old', 'year old', 'date of birth', 'birth date', 'birthdate', 'birthday', 'when were you born', 'graduation year', 'year you graduated'],
    de: ['Alter', 'Lebensalter', 'Altersgruppe', 'Altersangabe', 'Geburtsdatum', 'Geburtstag', 'Geburtsjahr', 'Jahrgang', 'wie alt sind Sie', 'wie alt bist du', 'Abschlussjahr'],
    es: ['edad', 'fecha de nacimiento', 'año de nacimiento', 'cumpleaños', 'cuántos años tiene', 'cuántos años tienes', 'año de graduación', 'año de titulación'],
    fr: ['âge', 'date de naissance', 'année de naissance', 'anniversaire', 'année d\'obtention du diplôme', 'année de diplôme'],
    nb: ['alder', 'aldersgruppe', 'fødselsdato', 'fødselsår', 'fødselsdag', 'hvor gammel', 'avgangsår', 'eksamensår'],
    vi: ['tuổi', 'độ tuổi', 'bao nhiêu tuổi', 'ngày sinh', 'năm sinh', 'ngày tháng năm sinh', 'sinh nhật', 'năm tốt nghiệp'],
  },
  // Race, ethnicity, ancestry, national origin, and language proxies for them.
  originAndRace: {
    en: ['race', 'racial', 'ethnicity', 'ethnic origin', 'ancestry', 'national origin', 'country of birth', 'place of birth', 'native language', 'mother tongue', 'accent', 'skin color', 'skin colour'],
    de: ['Rasse', 'Ethnie', 'ethnische Herkunft', 'ethnische Zugehörigkeit', 'Volkszugehörigkeit', 'Abstammung', 'nationale Herkunft', 'Herkunftsland', 'Geburtsland', 'Geburtsort', 'Muttersprache', 'Hautfarbe', 'Akzent'],
    es: ['raza', 'racial', 'etnia', 'etnicidad', 'origen étnico', 'ascendencia', 'origen nacional', 'país de nacimiento', 'lugar de nacimiento', 'país de origen', 'lengua materna', 'idioma materno', 'color de piel', 'acento'],
    fr: ['race', 'raciale', 'ethnie', 'origine ethnique', 'appartenance ethnique', 'ascendance', 'origine nationale', 'pays de naissance', 'lieu de naissance', 'pays d\'origine', 'langue maternelle', 'couleur de peau'],
    nb: ['rase', 'etnisitet', 'etnisk bakgrunn', 'etnisk opprinnelse', 'folkegruppe', 'avstamning', 'nasjonal opprinnelse', 'fødeland', 'fødested', 'morsmål', 'hudfarge', 'aksent'],
    vi: ['chủng tộc', 'sắc tộc', 'dân tộc', 'nguồn gốc dân tộc', 'tổ tiên', 'nơi sinh', 'quê quán', 'tiếng mẹ đẻ', 'màu da'],
  },
  // Citizenship and immigration status are especially jurisdiction-dependent.
  citizenshipAndImmigration: {
    en: ['citizenship', 'citizen of', 'nationality', 'immigration status', 'visa status', 'work permit', 'work authorization', 'work authorisation', 'authorized to work', 'authorised to work', 'right to work', 'residence permit'],
    de: ['Staatsangehörigkeit', 'Staatsbürgerschaft', 'Nationalität', 'Einwanderungsstatus', 'Aufenthaltsstatus', 'Aufenthaltstitel', 'Aufenthaltserlaubnis', 'Arbeitserlaubnis', 'Arbeitsgenehmigung', 'Arbeitsvisum', 'Visum'],
    es: ['ciudadanía', 'nacionalidad', 'estatus migratorio', 'situación migratoria', 'permiso de trabajo', 'permiso de residencia', 'autorización de trabajo', 'autorización para trabajar', 'autorizado para trabajar', 'visado'],
    fr: ['citoyenneté', 'nationalité', 'statut d\'immigration', 'titre de séjour', 'permis de séjour', 'permis de travail', 'autorisation de travail', 'autorisé à travailler', 'droit de travailler'],
    nb: ['statsborgerskap', 'statsborger', 'nasjonalitet', 'oppholdstillatelse', 'arbeidstillatelse', 'oppholdsstatus', 'innvandringsstatus'],
    vi: ['quốc tịch', 'tình trạng nhập cư', 'giấy phép lao động', 'giấy phép làm việc', 'thị thực', 'thẻ thường trú'],
  },
  // Sex, gender, sexual orientation, and pregnancy.
  sexAndGender: {
    en: ['gender', 'sex', 'sex assigned', 'sexual orientation', 'transgender', 'pregnant', 'pregnancy', 'birth control', 'reproductive', 'pronoun', 'pronouns'],
    de: ['Geschlecht', 'Geschlechtsidentität', 'sexuelle Orientierung', 'sexuelle Ausrichtung', 'transgender', 'transsexuell', 'schwanger', 'Schwangerschaft', 'Verhütung', 'Pronomen'],
    es: ['sexo', 'identidad de género', 'orientación sexual', 'transgénero', 'transexual', 'embarazo', 'embarazada', 'pronombres'],
    fr: ['sexe', 'identité de genre', 'orientation sexuelle', 'transgenre', 'transsexuel', 'grossesse', 'enceinte', 'pronoms'],
    nb: ['kjønn', 'kjønnsidentitet', 'seksuell orientering', 'legning', 'transperson', 'transkjønnet', 'gravid', 'graviditet', 'pronomen'],
    vi: ['giới tính', 'bản dạng giới', 'xu hướng tính dục', 'khuynh hướng tình dục', 'chuyển giới', 'mang thai', 'có thai', 'thai sản'],
  },
  // Marital, family, and caregiving status.
  familyAndCaregiving: {
    en: ['marital status', 'family status', 'married', 'single', 'divorced', 'spouse', 'partner name', 'partner\'s name', 'partner job', 'partner\'s job', 'partner work', 'partner\'s work', 'children', 'childcare', 'child care', 'caregiving', 'caregiver', 'dependant', 'dependants', 'dependent', 'dependents', 'family plan', 'family plans', 'start a family'],
    de: ['Familienstand', 'verheiratet', 'ledig', 'geschieden', 'Ehepartner', 'Ehepartnerin', 'Ehegatte', 'Ehefrau', 'Ehemann', 'Lebenspartner', 'Kinder', 'Kinderbetreuung', 'Kinderwunsch', 'Familienplanung', 'Betreuungspflichten', 'Pflegeverantwortung', 'Mutterschutz', 'Elternzeit'],
    es: ['estado civil', 'casado', 'casada', 'soltero', 'soltera', 'divorciado', 'divorciada', 'cónyuge', 'esposo', 'esposa', 'hijos', 'hijas', 'cuidado de niños', 'cuidado de hijos', 'personas a cargo', 'planes familiares', 'formar una familia', 'permiso de maternidad', 'permiso de paternidad'],
    fr: ['situation familiale', 'situation de famille', 'état civil', 'marié', 'mariée', 'célibataire', 'divorcé', 'divorcée', 'conjoint', 'conjointe', 'époux', 'épouse', 'enfants', 'garde d\'enfants', 'personnes à charge', 'projets familiaux', 'fonder une famille', 'congé maternité', 'congé parental'],
    nb: ['sivilstatus', 'sivilstand', 'gift', 'ugift', 'skilt', 'ektefelle', 'samboer', 'barn', 'barnepass', 'omsorgsansvar', 'forsørgeransvar', 'familieplaner', 'foreldrepermisjon'],
    vi: ['tình trạng hôn nhân', 'đã kết hôn', 'kết hôn', 'độc thân', 'ly hôn', 'vợ chồng', 'vợ hoặc chồng', 'con cái', 'chăm sóc con', 'người phụ thuộc', 'kế hoạch sinh con', 'nghỉ thai sản'],
  },
  // Religion or belief, including proxies such as congregation membership.
  religionAndBelief: {
    en: ['religion', 'religious', 'faith', 'church', 'mosque', 'synagogue', 'temple', 'congregation', 'place of worship'],
    de: ['Religion', 'Religionszugehörigkeit', 'religiös', 'Konfession', 'Glaube', 'Glaubensgemeinschaft', 'Weltanschauung', 'Kirche', 'Moschee', 'Synagoge', 'Gottesdienst'],
    es: ['religión', 'religioso', 'religiosa', 'confesión religiosa', 'creencias religiosas', 'iglesia', 'mezquita', 'sinagoga', 'lugar de culto'],
    fr: ['religion', 'religieux', 'religieuse', 'confession religieuse', 'croyances religieuses', 'église', 'mosquée', 'synagogue', 'lieu de culte'],
    nb: ['religion', 'religiøs', 'trossamfunn', 'trosretning', 'livssyn', 'kirke', 'moské', 'synagoge', 'tempel'],
    vi: ['tôn giáo', 'tín ngưỡng', 'đức tin', 'nhà thờ', 'thánh đường', 'giáo hội'],
  },
  // Disability, medical, genetic, and sickness-absence information.
  healthAndDisability: {
    en: ['disability', 'disabilities', 'disabled', 'medical condition', 'medical history', 'medical record', 'health condition', 'health history', 'mental health', 'illness', 'disease', 'diagnosis', 'prescription', 'medication', 'genetic information', 'genetic test', 'workers\' compensation', 'workers compensation', 'sick leave history'],
    de: ['Behinderung', 'Behinderungen', 'behindert', 'Schwerbehinderung', 'Grad der Behinderung', 'Krankheit', 'Erkrankung', 'Gesundheitszustand', 'Krankengeschichte', 'Krankheitsgeschichte', 'psychische Gesundheit', 'Diagnose', 'Medikamente', 'genetische Untersuchung', 'genetische Informationen', 'Krankenstand', 'Fehlzeiten', 'Arbeitsunfähigkeit'],
    es: ['discapacidad', 'discapacidades', 'discapacitado', 'minusvalía', 'condición médica', 'historial médico', 'historial clínico', 'estado de salud', 'salud mental', 'enfermedad', 'diagnóstico', 'medicación', 'medicamentos', 'información genética', 'prueba genética', 'baja médica', 'baja por enfermedad', 'incapacidad'],
    fr: ['handicap', 'handicapé', 'invalidité', 'condition médicale', 'dossier médical', 'antécédents médicaux', 'état de santé', 'santé mentale', 'maladie', 'diagnostic', 'médicaments', 'information génétique', 'test génétique', 'arrêt maladie', 'congé maladie', 'accident du travail'],
    nb: ['funksjonsnedsettelse', 'funksjonshemming', 'funksjonshemmet', 'uførhet', 'ufør', 'helsetilstand', 'helseopplysninger', 'psykisk helse', 'sykdom', 'diagnose', 'medisiner', 'medisinering', 'genetisk test', 'genetiske opplysninger', 'sykefravær', 'sykemelding', 'yrkesskade'],
    vi: ['khuyết tật', 'tàn tật', 'tình trạng sức khỏe', 'hồ sơ y tế', 'tiền sử bệnh', 'sức khỏe tâm thần', 'bệnh tật', 'chẩn đoán', 'thuốc điều trị', 'xét nghiệm di truyền', 'thông tin di truyền', 'nghỉ ốm', 'tai nạn lao động'],
  },
  // Criminal, credit, pay, union, political, and veteran history: restricted in
  // at least some jurisdictions and unnecessary for a qualifications-only screen.
  backgroundAndAffiliation: {
    en: ['criminal history', 'criminal record', 'arrested', 'arrest', 'arrests', 'convicted', 'conviction', 'convictions', 'credit history', 'credit score', 'bankrupt', 'bankruptcy', 'salary history', 'previous salary', 'current salary', 'union membership', 'trade union', 'political affiliation', 'political party', 'veteran status', 'military status'],
    de: ['Vorstrafen', 'Führungszeugnis', 'verhaftet', 'Verhaftung', 'verurteilt', 'Verurteilung', 'Straftat', 'Bonität', 'Kreditwürdigkeit', 'Schufa', 'Insolvenz', 'Privatinsolvenz', 'Gehaltshistorie', 'bisheriges Gehalt', 'aktuelles Gehalt', 'letztes Gehalt', 'Gewerkschaft', 'Gewerkschaftsmitgliedschaft', 'politische Zugehörigkeit', 'Parteizugehörigkeit', 'Wehrdienst', 'Militärdienst', 'Veteranenstatus'],
    es: ['antecedentes penales', 'registro penal', 'detenido', 'arrestado', 'condenado', 'condena', 'delito', 'historial crediticio', 'historial de crédito', 'solvencia', 'quiebra', 'bancarrota', 'historial salarial', 'salario anterior', 'salario actual', 'sueldo anterior', 'sueldo actual', 'afiliación sindical', 'sindicato', 'afiliación política', 'partido político', 'servicio militar', 'estatus de veterano'],
    fr: ['casier judiciaire', 'antécédents judiciaires', 'arrestation', 'condamnation', 'condamné', 'infraction pénale', 'historique de crédit', 'solvabilité', 'faillite', 'historique salarial', 'salaire actuel', 'salaire précédent', 'affiliation syndicale', 'syndicat', 'affiliation politique', 'parti politique', 'service militaire', 'ancien combattant'],
    nb: ['rulleblad', 'strafferegister', 'straffeattest', 'politiattest', 'arrestert', 'arrestasjon', 'domfelt', 'straffedom', 'kredittsjekk', 'kreditthistorikk', 'betalingsanmerkning', 'konkurs', 'lønnshistorikk', 'tidligere lønn', 'nåværende lønn', 'fagforening', 'fagforeningsmedlemskap', 'politisk tilhørighet', 'politisk parti', 'militærtjeneste', 'verneplikt', 'veteranstatus'],
    vi: ['tiền án', 'tiền sự', 'lý lịch tư pháp', 'bị bắt', 'bị kết án', 'kết án', 'lịch sử tín dụng', 'điểm tín dụng', 'phá sản', 'lịch sử lương', 'mức lương hiện tại', 'lương trước đây', 'công đoàn', 'đảng phái', 'khuynh hướng chính trị', 'nghĩa vụ quân sự', 'cựu chiến binh'],
  },
  // Requests that expose appearance, residence, or personal social profiles.
  personalDataRequests: {
    en: ['headshot', 'photograph', 'photo of you', 'photo of yourself', 'home address', 'residential address', 'personal social media'],
    de: ['Bewerbungsfoto', 'Lichtbild', 'Passfoto', 'Porträtfoto', 'Foto von Ihnen', 'Foto von dir', 'Privatanschrift', 'Wohnanschrift', 'Wohnadresse', 'Privatadresse', 'private soziale Medien'],
    es: ['foto personal', 'fotografía personal', 'foto tuya', 'foto suya', 'foto de rostro', 'dirección particular', 'domicilio particular', 'dirección de casa', 'redes sociales personales'],
    fr: ['photo de vous', 'photographie personnelle', 'photo d\'identité', 'adresse personnelle', 'adresse du domicile', 'domicile personnel', 'réseaux sociaux personnels'],
    nb: ['bilde av deg', 'portrettbilde', 'passbilde', 'privat adresse', 'hjemmeadresse', 'bostedsadresse', 'private sosiale medier'],
    vi: ['ảnh chân dung', 'ảnh cá nhân', 'ảnh của bạn', 'địa chỉ nhà', 'địa chỉ thường trú', 'mạng xã hội cá nhân'],
  },
}

/**
 * Single words that are too broad for the generator's filter — "health" would
 * remove a legitimate question about health-care experience — but appropriate
 * for deciding which questions may drive an automatic decision. Excluding a
 * question there only costs the recruiter one automation candidate.
 */
const BROAD_AUTOMATION_TERMS: TermsByLocale = {
  en: ['medical', 'health', 'marital', 'visa', 'arrest', 'union', 'political', 'veteran', 'military'],
  // No bare "Ehe": compound matching would take "ehemaliger Arbeitgeber" with it.
  de: ['medizinisch', 'Gesundheit', 'politisch', 'Militär', 'militärisch', 'Veteran'],
  es: ['médico', 'médica', 'salud', 'matrimonio', 'sindical', 'político', 'militar', 'veterano'],
  fr: ['médical', 'médicale', 'santé', 'mariage', 'syndical', 'politique', 'militaire'],
  nb: ['medisinsk', 'helse', 'ekteskap', 'politisk', 'militær', 'veteran'],
  vi: ['y tế', 'sức khỏe', 'hôn nhân', 'chính trị', 'quân sự'],
}

/**
 * Accents decompose in more than one way and apostrophes arrive both straight
 * and curly, so both the terms and the text under test are normalized before
 * they are compared. Without this, "tuổi" typed by one client fails to match
 * "tuổi" written by another.
 */
function normalizeForMatching(value: string): string {
  return value.normalize('NFC').replace(/[‘’ʼ]/g, '\'')
}

/**
 * `\b` is defined over ASCII word characters, which makes it useless here: it
 * finds no boundary at all before "âge" or after "sức khỏe". Unicode letter and
 * number lookarounds keep whole-word matching working in every locale, so
 * "Alter" still does not fire on "Alternative".
 */
const WORD_CHARACTER = '[\\p{L}\\p{N}]'

/**
 * German and Norwegian attach the definite article and the plural to the noun,
 * so a listed term routinely appears as "fødselsdatoen", "statsborgerskapet",
 * or "Behinderungen". Those locales are matched with a short trailing-letter
 * allowance instead of a hard boundary; three letters covers the endings
 * without reaching the next element of a compound, so "fødselsdato" still does
 * not fire on "fødselsdatoformattering" and "barn" leaves "barnehage" alone.
 */
const INFLECTING_LOCALES = new Set<SensitiveTermLocale>(['de', 'nb'])
const MAX_INFLECTION_SUFFIX = 3

/**
 * How a term may end. Broad automation terms use `compound` — those locales
 * build words like "helseutfordringer" and "Gesundheitsdaten" out of exactly
 * the words on that list, and losing an automation candidate to an over-eager
 * match there is the cheap error.
 */
type TermEnding = 'boundary' | 'inflection' | 'compound'

const TERM_ENDINGS: Record<TermEnding, string> = {
  boundary: `(?!${WORD_CHARACTER})`,
  inflection: `\\p{L}{0,${MAX_INFLECTION_SUFFIX}}(?!${WORD_CHARACTER})`,
  compound: '',
}

function compilePattern(terms: string[], ending: TermEnding): RegExp {
  const alternation = terms
    .map(term => normalizeForMatching(term)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Multi-word terms are also written hyphenated or across a line break.
      .replace(/\s+/g, '[\\s\\-]+'))
    .join('|')

  return new RegExp(
    `(?<!${WORD_CHARACTER})(?:${alternation})${TERM_ENDINGS[ending]}`,
    'iu',
  )
}

/** One pattern for the locales matched verbatim, one for the inflecting ones. */
function buildPatterns(terms: TermsByLocale, inflectingEnding: TermEnding): RegExp[] {
  const entries = Object.entries(terms) as [SensitiveTermLocale, string[]][]
  const verbatim = entries.filter(([locale]) => !INFLECTING_LOCALES.has(locale)).flatMap(([, list]) => list)
  const inflecting = entries.filter(([locale]) => INFLECTING_LOCALES.has(locale)).flatMap(([, list]) => list)

  return [
    compilePattern(verbatim, 'boundary'),
    compilePattern(inflecting, inflectingEnding),
  ]
}

const PROTECTED_TRAIT_PATTERNS = Object.values(PROTECTED_TRAIT_TERMS)
  .flatMap(terms => buildPatterns(terms, 'inflection'))
const BROAD_AUTOMATION_PATTERNS = buildPatterns(BROAD_AUTOMATION_TERMS, 'compound')

/** Terms indicating a question asks for a protected or sensitive trait. */
export function containsProtectedTraitTerms(value: string): boolean {
  const normalized = normalizeForMatching(value)
  return PROTECTED_TRAIT_PATTERNS.some(pattern => pattern.test(normalized))
}

/**
 * The same terms plus the broad single words, for questions that could be wired
 * into automatic status changes.
 */
export function containsAutomationSensitiveTerms(value: string): boolean {
  const normalized = normalizeForMatching(value)
  return BROAD_AUTOMATION_PATTERNS.some(pattern => pattern.test(normalized))
    || containsProtectedTraitTerms(value)
}
