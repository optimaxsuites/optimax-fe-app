import type { ImportedEmployeeData } from './pre-onboarding-import.component';
import { parseImportedDate } from '../employee-import.util';

/*
 * Reads a pre-onboarding form PDF that was filled in on a computer (Preview, Acrobat "Fill & Sign",
 * Edge and the like) straight from the file, with no OCR. Those tools store each typed value as a text
 * annotation, or burn it into the page as text; either way it has a position, and every value sits just
 * under (or on) its label on the printed form. So each value is matched to the closest label above it,
 * in the same section of the form.
 *
 * Gender, marital status, religion and employment type are write-in lines on the form. Older copies
 * had tick boxes there; a tick is a drawn mark, not text, so those still need the AI read or HR.
 */

/** pdf.js document, typed loosely: this project and the host app ship different pdfjs-dist majors. */
type PdfDocument = { numPages: number; getPage(n: number): Promise<any> };

type Section = 'header' | 'personal' | 'employment' | 'bank' | 'nok' | 'guarantor' | 'declaration';

const SECTION_HEADERS: Record<string, Section> = {
  'PERSONAL INFORMATION': 'personal',
  'EMPLOYMENT DETAILS': 'employment',
  'BANK INFORMATION': 'bank',
  'NEXT OF KIN': 'nok',
  'GUARANTOR INFORMATION': 'guarantor',
  'DECLARATION': 'declaration',
};

/**
 * Label text → field, per section. Labels with nowhere to go on the record still map (to a `_` key),
 * so a value under them isn't handed to the neighbouring label instead.
 * Guarantor fields are per column; `g` becomes g1 or g2 by which half of the page the value is on.
 */
const LABELS: Partial<Record<Section, Record<string, string>>> = {
  header: { 'FORM NO.': '_formNo', 'DATE': '_formDate', 'STAFF ID': '_staffId' },
  personal: {
    'SURNAME': 'lastName', 'FIRST NAME': 'firstName', 'MIDDLE NAME': 'middleName',
    'DATE OF BIRTH': 'dob', 'GENDER': 'gender', 'MARITAL STATUS': 'maritalStatus', 'RELIGION': 'religion',
    'NATIONALITY': 'nationality', 'STATE OF ORIGIN': 'stateOfOrigin', 'LGA OF ORIGIN': 'lgaOfOrigin',
    'PHONE NUMBER': 'phone', 'ALTERNATE PHONE': '_altPhone',
    'EMAIL ADDRESS': 'email', 'PERSONAL EMAIL': '_personalEmail',
    'RESIDENTIAL ADDRESS': 'address', 'PERMANENT ADDRESS': '_permanentAddress',
  },
  employment: {
    'DEPARTMENT': 'department', 'JOB TITLE / POSITION': 'jobTitle', 'EMPLOYMENT TYPE': 'employmentType',
    'PROPOSED START DATE': 'startDate', 'BRANCH / LOCATION': 'branch',
    'HIGHEST QUALIFICATION': 'highestQualification', 'FIELD OF STUDY': 'fieldOfStudy',
  },
  bank: { 'BANK NAME': 'bankName', 'ACCOUNT NAME': 'accountName', 'ACCOUNT NUMBER': 'accountNumber', 'BVN': 'bvn' },
  nok: {
    'FULL NAME': 'nokName', 'RELATIONSHIP': 'nokRelationship', 'PHONE NUMBER': 'nokPhone',
    'EMAIL ADDRESS': 'nokEmail', 'ADDRESS': 'nokAddress',
  },
  guarantor: {
    'FULL NAME': 'gName', 'OCCUPATION': '_gOccupation', 'RELATIONSHIP TO APPLICANT': '_gRelationship',
    'PHONE NUMBER': 'gPhone', 'EMAIL ADDRESS': 'gEmail', 'ADDRESS': '_gAddress',
  },
};

/** Printed text on the blank form that isn't a label: never a value. (The tick-box words are from older copies.) */
const STATIC_TEXT = new Set([
  'MALE', 'FEMALE', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'CHRISTIANITY', 'ISLAM', 'OTHER',
  'FULL-TIME', 'PART-TIME', 'CONTRACT', 'PASSPORT', 'PHOTO', '3.5 × 4.5 CM', '/', '(OPTIONAL)',
  '(IF DIFFERENT)', '(10 DIGITS)', '(11 DIGITS)', 'GUARANTOR 1', 'GUARANTOR 2', 'OPTIMAX',
  'PRE-ONBOARDING INFORMATION FORM',
]);

/** `top` is the top edge (what a value is matched by); `baseline` is where a label's text sits. */
/** The printed choices beside a write-in label, e.g. "(Male / Female)", even when wrapped over two lines. */
function isChoiceHint(text: string): boolean {
  return /[()\/]/.test(text) && text.replace(/[()\/]/g, ' ').split(/\s+/).filter(Boolean)
    .every((word) => CHOICE_WORDS.has(word.replace(/-$/, '')));
}
const CHOICE_WORDS = new Set(['MALE', 'FEMALE', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'CHRISTIANITY', 'ISLAM',
  'OTHER', 'FULL-TIME', 'PART-TIME', 'CONTRACT', 'FULL', 'PART', 'TIME']);

/** What someone wrote for a choice ("F", "christian", "fulltime"), as the option the review screen lists. */
function choice(raw: string | undefined, options: [RegExp, string][]): string | undefined {
  if (!raw) return undefined;
  const text = raw.trim();
  return options.find(([pattern]) => pattern.test(text))?.[1] ?? text;
}
const GENDERS: [RegExp, string][] = [[/^(f|fem|female|woman)\b/i, 'Female'], [/^(m|male|man)\b/i, 'Male']];
const MARITAL_STATUSES: [RegExp, string][] = [
  [/^single|^unmarried/i, 'Single'], [/^married/i, 'Married'], [/^divorc/i, 'Divorced'], [/^widow/i, 'Widowed'],
];
const RELIGIONS: [RegExp, string][] = [[/^christ|^catholic/i, 'Christianity'], [/^islam|^muslim/i, 'Islam'], [/./, 'Other']];
const EMPLOYMENT_TYPES: [RegExp, string][] = [
  [/^(full[\s-]*time|ft)\b/i, 'Full-Time'], [/^(part[\s-]*time|pt)\b/i, 'Part-Time'], [/^contract/i, 'Contract'],
];

interface Piece { page: number; x: number; top: number; baseline: number; text: string; }
interface Label extends Piece { section: Section; field: string; }

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim().toUpperCase();

/** Values from a filled-in form PDF; fields it couldn't find are left out. */
export async function readFilledPreOnboardingForm(pdf: PdfDocument): Promise<ImportedEmployeeData> {
  const labels: Label[] = [];
  const values: (Piece & { section: Section; half: 1 | 2; fromAnnotation: boolean })[] = [];
  let section: Section = 'header';

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const midX = (page.view[0] + page.view[2]) / 2;
    const [content, annotations] = await Promise.all([page.getTextContent(), page.getAnnotations()]);

    // Everything on the page with a position, read top to bottom so section headers come in order.
    const pieces: (Piece & { fromAnnotation: boolean })[] = [];
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const baseline = item.transform[5];
      pieces.push({ page: pageNo, x: item.transform[4], top: baseline + (item.height || 0), baseline, text: item.str, fromAnnotation: false });
    }
    for (const a of annotations as any[]) {
      const text = a.contentsObj?.str ?? a.fieldValue;
      if (a.subtype !== 'FreeText' && a.subtype !== 'Widget') continue;
      if (typeof text !== 'string' || !text.trim()) continue;
      pieces.push({ page: pageNo, x: a.rect[0], top: a.rect[3], baseline: a.rect[1], text, fromAnnotation: true });
    }
    pieces.sort((p, q) => q.top - p.top || p.x - q.x);

    for (const piece of pieces) {
      const key = normalise(piece.text);
      if (!piece.fromAnnotation && SECTION_HEADERS[key]) {
        // The section number ("01") printed just left of the header was read as a value; drop it.
        const last = values[values.length - 1];
        if (last && !last.fromAnnotation && last.page === pageNo && Math.abs(last.top - piece.top) < 3 && /^\d{2}$/.test(last.text.trim())) {
          values.pop();
        }
        section = SECTION_HEADERS[key];
        continue;
      }
      const field = piece.fromAnnotation ? undefined : LABELS[section]?.[key];
      if (field) {
        labels.push({ ...piece, section, field });
      } else if (piece.fromAnnotation || !(STATIC_TEXT.has(key) || isChoiceHint(key))) {
        values.push({ ...piece, section, half: piece.x < midX ? 1 : 2 });
      }
    }
  }

  // Each value goes to the nearest label just above it (or level with it) that starts to its left.
  const parts = new Map<string, Piece[]>();
  for (const value of values) {
    const candidates = labels
      .filter((l) => l.page === value.page && l.section === value.section && l.x <= value.x + 20)
      .map((l) => ({ l, dy: l.baseline - value.top }))
      .filter(({ dy }) => dy >= -12 && dy <= 26);
    if (!candidates.length) continue;
    const best = Math.min(...candidates.map(({ dy }) => Math.abs(dy - 4)));
    const label = candidates
      .filter(({ dy }) => Math.abs(dy - 4) <= best + 3)
      .sort((p, q) => q.l.x - p.l.x)[0].l;
    const field = label.field.startsWith('g') && label.section === 'guarantor'
      ? `g${value.half}${label.field.slice(1)}`
      : label.field;
    if (!parts.has(field)) parts.set(field, []);
    parts.get(field)!.push(value);
  }

  const text = (field: string, joiner = ' ') => {
    const seen = new Set<string>();
    const joined = (parts.get(field) ?? [])
      // Line by line, then left to right; pieces on one line can sit a point or two apart.
      .sort((p, q) => (Math.abs(q.top - p.top) > 4 ? q.top - p.top : p.x - q.x))
      .map((p) => p.text.trim())
      .filter((t) => t && !seen.has(t) && seen.add(t))
      .join(joiner)
      .trim();
    return joined || undefined;
  };
  const digits = (field: string) => text(field, '')?.replace(/\D/g, '') || undefined;

  const data: ImportedEmployeeData = {
    firstName: text('firstName'),
    lastName: text('lastName'),
    middleName: text('middleName'),
    dob: isoDate(text('dob', '/')),
    gender: choice(text('gender'), GENDERS),
    maritalStatus: choice(text('maritalStatus'), MARITAL_STATUSES),
    religion: choice(text('religion'), RELIGIONS),
    employmentType: choice(text('employmentType'), EMPLOYMENT_TYPES),
    nationality: text('nationality'),
    stateOfOrigin: text('stateOfOrigin'),
    lgaOfOrigin: text('lgaOfOrigin'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    department: text('department'),
    jobTitle: text('jobTitle'),
    startDate: isoDate(text('startDate', '/')),
    branch: text('branch'),
    highestQualification: text('highestQualification'),
    fieldOfStudy: text('fieldOfStudy'),
    bankName: text('bankName'),
    accountName: text('accountName'),
    accountNumber: digits('accountNumber'),
    bvn: digits('bvn'),
    nokName: text('nokName'),
    nokRelationship: text('nokRelationship'),
    nokPhone: text('nokPhone'),
    nokEmail: text('nokEmail'),
    nokAddress: text('nokAddress'),
    g1Name: text('g1Name'),
    g1Phone: text('g1Phone'),
    g1Email: text('g1Email'),
    g2Name: text('g2Name'),
    g2Phone: text('g2Phone'),
    g2Email: text('g2Email'),
  };
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v)) as ImportedEmployeeData;
}

/**
 * A typed date as yyyy-MM-dd, for the review screen's date inputs. Handles the digit boxes typed one
 * per box (ddmmyyyy once joined) as well as "12-10-2026", "04/11/2026" and "4 Nov 2026".
 */
function isoDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const onlyDigits = raw.replace(/\D/g, '');
  const text = onlyDigits.length === 8 && !/[a-z]/i.test(raw)
    ? `${onlyDigits.slice(0, 2)}/${onlyDigits.slice(2, 4)}/${onlyDigits.slice(4)}`
    : raw.replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  const date = parseImportedDate(text);
  if (!date) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
