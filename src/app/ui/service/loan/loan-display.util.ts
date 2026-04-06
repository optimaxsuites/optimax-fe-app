import { LoanApplication, LoanAuditUser, PaymentRecord } from './loan.types';

const loanActorCacheKey = 'advance-loan-actor-name-cache';
const loanStatusActorCacheKey = 'advance-loan-status-actor-cache';
const loanInterestRateCacheKey = 'advance-loan-interest-rate-cache';
const loanStatusNoteCacheKey = 'advance-loan-status-note-cache';
const loanRepaymentStartDateCacheKey = 'advance-loan-repayment-start-date-cache';

export function formatLoanPurposeDisplay(purpose?: string | null): string {
  return toTitleCase((purpose || '').replace(/_/g, ' ')) || 'N/A';
}

export function formatLoanPaymentModeDisplay(mode?: string | null): string {
  switch (String(mode || '').toUpperCase()) {
    case 'MONTHLY':
      return 'Monthly';
    case 'ONE_OFF':
      return 'One Off';
    default:
      return toTitleCase((mode || '').replace(/_/g, ' ')) || 'Not specified';
  }
}

export function normalizeLoanRepaymentStartDate(value?: unknown): string {
  if (Array.isArray(value)) {
    const [year, month, day] = value.map((part) => Number(part || 0));
    if (
      Number.isFinite(year) && year > 0 &&
      Number.isFinite(month) && month >= 1 && month <= 12 &&
      Number.isFinite(day) && day >= 1 && day <= 31
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  const accidentalPrefixedDayMatch = rawValue.match(/^(\d{1,2})(\d{4}-\d{2}-\d{2})$/);
  if (accidentalPrefixedDayMatch) {
    const prefixedDay = Number(accidentalPrefixedDayMatch[1]);
    if (Number.isFinite(prefixedDay) && prefixedDay >= 1 && prefixedDay <= 31) {
      return accidentalPrefixedDayMatch[2];
    }
  }

  const monthMatch = rawValue.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return `${monthMatch[1]}-${monthMatch[2]}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLoanRepaymentMonthYear(value?: string | null): string {
  const normalizedDate = normalizeLoanRepaymentStartDate(value);
  if (!normalizedDate) {
    return 'N/A';
  }

  const [yearToken, monthToken] = normalizedDate.split('-');
  const year = Number(yearToken);
  const month = Number(monthToken);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
}

export function formatLoanRepaymentDayDisplay(day?: number | null): string {
  const normalizedDay = Number(day);
  if (!Number.isFinite(normalizedDay) || normalizedDay < 1) {
    return 'N/A';
  }

  return `${normalizedDay}${getOrdinalSuffix(normalizedDay)} of each month`;
}

export function formatLoanDepartmentDisplay(department?: unknown): string {
  if (typeof department === 'string' && department.trim() === '') {
    return '';
  }

  const resolvedDepartment = resolveDepartmentDisplay(department);
  return resolvedDepartment || 'N/A';
}

const naturalSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

export function compareLoanSortValues(left: string | number | null | undefined, right: string | number | null | undefined): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);
  const numericLeft = parseSortableNumber(normalizedLeft);
  const numericRight = parseSortableNumber(normalizedRight);

  if (numericLeft !== null && numericRight !== null) {
    return numericLeft - numericRight;
  }

  return naturalSortCollator.compare(normalizedLeft, normalizedRight);
}

export function resolveLoanEmployeeName(loan: Pick<LoanApplication, 'fullName' | 'employeeId'>): string {
  const fullName = String(loan.fullName || '').trim();
  if (fullName) {
    return fullName;
  }

  const employeeId = Number(loan.employeeId || 0);
  return employeeId > 0 ? `Employee ${employeeId}` : 'Unknown User';
}

export function resolveLoanActorName(
  actor: LoanAuditUser | number | string | undefined | null,
  options: { fallbackName?: string; fallbackUserId?: number | null } = {}
): string {
  cacheCurrentUserActor();

  const explicitName = extractExplicitActorName(actor);
  const explicitUserId = extractActorUserId(actor) || Number(options.fallbackUserId || 0);
  if (explicitName && explicitUserId > 0) {
    persistActorName(explicitUserId, explicitName);
  }

  if (explicitName && !isPlaceholderActorLabel(explicitName)) {
    return explicitName;
  }

  const actorUserId = explicitUserId;
  const currentUserId = getStoredCurrentUserId();
  const currentUserName = getStoredCurrentUserName();

  if (actorUserId > 0 && currentUserId > 0 && actorUserId === currentUserId && currentUserName) {
    persistActorName(actorUserId, currentUserName);
    return currentUserName;
  }

  if (actorUserId > 0) {
    const cachedActorName = readActorName(actorUserId);
    if (cachedActorName) {
      return cachedActorName;
    }
  }

  const fallbackName = String(options.fallbackName || '').trim();
  if (fallbackName) {
    if (actorUserId > 0) {
      persistActorName(actorUserId, fallbackName);
    }
    return fallbackName;
  }

  if (explicitName) {
    return explicitName;
  }

  return actorUserId > 0 ? `User ${actorUserId}` : 'Unknown User';
}

export function persistLoanStatusActorName(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>,
  status: LoanApplication['status'],
  actor: LoanAuditUser | number | string | undefined | null,
  fallbackName?: string
): void {
  const actorUserId = extractActorUserId(actor);
  const actorName = resolveLoanActorName(actor, {
    fallbackName,
    fallbackUserId: actorUserId || undefined
  });

  if (!actorName || isPlaceholderActorLabel(actorName) || /^user\s+\d+$/i.test(actorName)) {
    return;
  }

  const cache = readLoanStatusActorCache();
  const normalizedStatus = String(status || '').toUpperCase();
  const nextEntry = {
    ...readLoanStatusActorEntry(cache, loan),
    [normalizedStatus]: actorName
  };

  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();

  if (loanId > 0) {
    cache[`id:${loanId}`] = nextEntry;
  }

  if (loanCode) {
    cache[`code:${loanCode}`] = nextEntry;
  }

  writeLoanStatusActorCache(cache);
}

export function readPersistedLoanStatusActorName(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>,
  status: LoanApplication['status']
): string {
  const normalizedStatus = String(status || '').toUpperCase();
  const entry = readLoanStatusActorEntry(readLoanStatusActorCache(), loan);
  return String(entry[normalizedStatus] || '').trim();
}

export function persistLoanInterestRate(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>,
  interestRate: number | undefined | null
): void {
  const normalizedInterestRate = Number(interestRate);
  if (!Number.isFinite(normalizedInterestRate) || normalizedInterestRate < 0) {
    return;
  }

  const cache = readLoanInterestRateCache();
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();
  const roundedInterestRate = Number(normalizedInterestRate.toFixed(2));

  if (loanId > 0) {
    cache[`id:${loanId}`] = roundedInterestRate;
  }

  if (loanCode) {
    cache[`code:${loanCode}`] = roundedInterestRate;
  }

  writeLoanInterestRateCache(cache);
}

export function readPersistedLoanInterestRate(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>
): number {
  const cache = readLoanInterestRateCache();
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();
  const cachedValue = Number(cache[`id:${loanId}`] ?? cache[`code:${loanCode}`]);
  return Number.isFinite(cachedValue) ? cachedValue : 0;
}

export function persistLoanRepaymentStartDate(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>,
  repaymentStartDate: unknown
): void {
  const normalizedRepaymentStartDate = normalizeLoanRepaymentStartDate(repaymentStartDate);
  if (!normalizedRepaymentStartDate) {
    return;
  }

  const cache = readLoanRepaymentStartDateCache();
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();

  if (loanId > 0) {
    cache[`id:${loanId}`] = normalizedRepaymentStartDate;
  }

  if (loanCode) {
    cache[`code:${loanCode}`] = normalizedRepaymentStartDate;
  }

  writeLoanRepaymentStartDateCache(cache);
}

export function readPersistedLoanRepaymentStartDate(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>
): string {
  const cache = readLoanRepaymentStartDateCache();
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();
  return normalizeLoanRepaymentStartDate(cache[`id:${loanId}`] ?? cache[`code:${loanCode}`] ?? '');
}

export function persistLoanStatusNote(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>,
  status: LoanApplication['status'],
  note: string | undefined | null
): void {
  const normalizedNote = String(note || '').trim();
  if (!normalizedNote) {
    return;
  }

  const cache = readLoanStatusNoteCache();
  const normalizedStatus = String(status || '').toUpperCase();
  const nextEntry = {
    ...readLoanStatusNoteEntry(cache, loan),
    [normalizedStatus]: normalizedNote
  };
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();

  if (loanId > 0) {
    cache[`id:${loanId}`] = nextEntry;
  }

  if (loanCode) {
    cache[`code:${loanCode}`] = nextEntry;
  }

  writeLoanStatusNoteCache(cache);
}

export function readPersistedLoanStatusNote(
  loan: Pick<LoanApplication, 'id' | 'loanCode'>,
  status: LoanApplication['status']
): string {
  const normalizedStatus = String(status || '').toUpperCase();
  const entry = readLoanStatusNoteEntry(readLoanStatusNoteCache(), loan);
  return String(entry[normalizedStatus] || '').trim();
}

export function resolvePaymentActorName(
  payment: Pick<PaymentRecord, 'receivedBy'> | undefined | null,
  fallbackName?: string
): string {
  cacheCurrentUserActor();

  const receivedBy = String(payment?.receivedBy || '').trim();
  if (receivedBy && !isPlaceholderActorLabel(receivedBy)) {
    return receivedBy;
  }

  const currentUserName = getStoredCurrentUserName();
  if (currentUserName && receivedBy && isPlaceholderActorLabel(receivedBy)) {
    return currentUserName;
  }

  const normalizedFallback = String(fallbackName || '').trim();
  if (normalizedFallback) {
    return normalizedFallback;
  }

  return currentUserName || 'Unknown User';
}

export function resolveCompletedLoanActor(loan: Pick<LoanApplication, 'paymentHistory' | 'fullName' | 'employeeId'>): string {
  const lastPayment = [...(loan.paymentHistory || [])]
    .filter((payment) => !!normalizeStoredValue(payment.paidAt))
    .sort((left, right) => new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime())[0];

  const employeeName = resolveLoanEmployeeName(loan);
  if (lastPayment) {
    return resolvePaymentActorName(lastPayment, employeeName);
  }

  return employeeName;
}

export function resolveLoanTotalPaid(loan: Pick<LoanApplication, 'totalPaid' | 'paymentHistory' | 'repaymentSchedule'>): number {
  const backendTotalPaid = Number(loan.totalPaid || 0);
  if (backendTotalPaid > 0) {
    return backendTotalPaid;
  }

  const paymentHistoryTotal = (loan.paymentHistory || []).reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );
  if (paymentHistoryTotal > 0) {
    return Number(paymentHistoryTotal.toFixed(2));
  }

  const schedulePaidTotal = (loan.repaymentSchedule || []).reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );
  return Number(schedulePaidTotal.toFixed(2));
}

export function resolveLoanTotalRepayableAmount(
  loan: Pick<LoanApplication, 'repaymentSchedule' | 'repaymentAmount' | 'repaymentTime' | 'amount'>
): number {
  const scheduledTotal = (loan.repaymentSchedule || []).reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );
  if (scheduledTotal > 0) {
    return Number(scheduledTotal.toFixed(2));
  }

  const periodicRepayment = Number(loan.repaymentAmount || 0);
  const tenureMonths = Number(loan.repaymentTime || 0);
  if (periodicRepayment > 0 && tenureMonths > 0) {
    return Number((periodicRepayment * tenureMonths).toFixed(2));
  }

  return Number(loan.amount || 0);
}

export function resolveLoanOutstandingBalance(
  loan: Pick<LoanApplication, 'currentBalance' | 'status' | 'paymentHistory' | 'repaymentSchedule' | 'repaymentAmount' | 'repaymentTime' | 'amount' | 'totalPaid'>
): number {
  const backendOutstanding = Number(loan.currentBalance || 0);
  if (backendOutstanding > 0) {
    return backendOutstanding;
  }

  if (loan.status === 'COMPLETED') {
    return 0;
  }

  const totalRepayable = resolveLoanTotalRepayableAmount(loan);
  const totalPaid = resolveLoanTotalPaid(loan);
  return Number(Math.max(totalRepayable - totalPaid, 0).toFixed(2));
}

export function resolveLoanRepaymentProgress(
  loan: Pick<LoanApplication, 'currentBalance' | 'status' | 'paymentHistory' | 'repaymentSchedule' | 'repaymentAmount' | 'repaymentTime' | 'amount' | 'totalPaid'>
): number {
  const totalRepayable = resolveLoanTotalRepayableAmount(loan);
  if (totalRepayable <= 0) {
    return 0;
  }

  const progress = (resolveLoanTotalPaid(loan) / totalRepayable) * 100;
  return Math.max(0, Math.min(Number(progress.toFixed(2)), 100));
}

export function hasLoanBeenDisbursed(loan: Pick<LoanApplication, 'disbursedDate' | 'status'>): boolean {
  return !!loan.disbursedDate || loan.status === 'ACTIVE' || loan.status === 'COMPLETED';
}

export function hasLoanRepaymentStarted(
  loan: Pick<LoanApplication, 'totalPaid' | 'paymentHistory' | 'repaymentSchedule'>
): boolean {
  return resolveLoanTotalPaid(loan) > 0;
}

export function getLoanRepaymentStatusTitle(
  loan: Pick<LoanApplication, 'disbursedDate' | 'status' | 'totalPaid' | 'paymentHistory' | 'repaymentSchedule'>
): string {
  if (!hasLoanBeenDisbursed(loan)) {
    return 'Repayment has not started';
  }

  if (loan.status === 'COMPLETED') {
    return 'Loan fully settled';
  }

  if (!hasLoanRepaymentStarted(loan)) {
    return 'Awaiting first repayment';
  }

  return 'Repayment in progress';
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) {
    return 'th';
  }

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function extractExplicitActorName(actor: LoanAuditUser | number | string | undefined | null): string {
  if (!actor) {
    return '';
  }

  if (typeof actor === 'string') {
    return actor.trim();
  }

  if (typeof actor === 'number') {
    return '';
  }

  return String(actor.fullname || actor.username || actor.email || '').trim();
}

function extractActorUserId(actor: LoanAuditUser | number | string | undefined | null): number {
  if (typeof actor === 'number' && Number.isFinite(actor)) {
    return actor;
  }

  if (typeof actor === 'string') {
    const normalizedActor = actor.trim();
    return /^\d+$/.test(normalizedActor) ? Number(normalizedActor) : 0;
  }

  if (actor && typeof actor === 'object') {
    const actorUserId = Number(actor.userId || actor.id || 0);
    return Number.isFinite(actorUserId) ? actorUserId : 0;
  }

  return 0;
}

function isPlaceholderActorLabel(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === 'system' || normalizedValue === 'employee' || normalizedValue === 'admin';
}

function getStoredCurrentUserId(): number {
  const storedUserId = normalizeStoredValue(sessionStorage.getItem('userid') || localStorage.getItem('userid'));
  if (!storedUserId || !/^\d+$/.test(storedUserId)) {
    return 0;
  }

  return Number(storedUserId);
}

function getStoredCurrentUserName(): string {
  const directKeys = ['fullname', 'userName', 'username', 'email'];
  for (const key of directKeys) {
    const directValue = normalizeStoredValue(sessionStorage.getItem(key) || localStorage.getItem(key));
    if (directValue) {
      return directValue;
    }
  }

  const structuredKeys = ['userRegData', 'userInfoRegData', 'userPrimaryInfoRegData'];
  for (const key of structuredKeys) {
    const parsedValue = parseStoredJson(sessionStorage.getItem(key) || localStorage.getItem(key));
    if (!parsedValue) {
      continue;
    }

    const candidateName = String(
      parsedValue['fullname'] || parsedValue['fullName'] || parsedValue['name'] || parsedValue['username'] || parsedValue['email'] || ''
    ).trim();
    if (candidateName) {
      return candidateName;
    }
  }

  return '';
}

function cacheCurrentUserActor(): void {
  const currentUserId = getStoredCurrentUserId();
  const currentUserName = getStoredCurrentUserName();
  if (currentUserId > 0 && currentUserName) {
    persistActorName(currentUserId, currentUserName);
  }
}

function persistActorName(userId: number, actorName: string): void {
  const normalizedActorName = String(actorName || '').trim();
  if (userId <= 0 || !normalizedActorName || isPlaceholderActorLabel(normalizedActorName)) {
    return;
  }

  const cache = readActorNameCache();
  cache[String(userId)] = normalizedActorName;
  writeActorNameCache(cache);
}

function readActorName(userId: number): string {
  const cache = readActorNameCache();
  return String(cache[String(userId)] || '').trim();
}

function readActorNameCache(): Record<string, string> {
  const rawValue = normalizeStoredValue(localStorage.getItem(loanActorCacheKey) || sessionStorage.getItem(loanActorCacheKey));
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeActorNameCache(cache: Record<string, string>): void {
  const serializedCache = JSON.stringify(cache);
  localStorage.setItem(loanActorCacheKey, serializedCache);
  sessionStorage.setItem(loanActorCacheKey, serializedCache);
}

function readLoanStatusActorEntry(
  cache: Record<string, Record<string, string>>,
  loan: Pick<LoanApplication, 'id' | 'loanCode'>
): Record<string, string> {
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();
  const entry = cache[`id:${loanId}`] || cache[`code:${loanCode}`] || {};
  return entry && typeof entry === 'object' ? entry : {};
}

function readLoanStatusActorCache(): Record<string, Record<string, string>> {
  const rawValue = normalizeStoredValue(localStorage.getItem(loanStatusActorCacheKey) || sessionStorage.getItem(loanStatusActorCacheKey));
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object'
      ? parsedValue as Record<string, Record<string, string>>
      : {};
  } catch {
    return {};
  }
}

function writeLoanStatusActorCache(cache: Record<string, Record<string, string>>): void {
  const serializedCache = JSON.stringify(cache);
  localStorage.setItem(loanStatusActorCacheKey, serializedCache);
  sessionStorage.setItem(loanStatusActorCacheKey, serializedCache);
}

function readLoanInterestRateCache(): Record<string, number> {
  const rawValue = normalizeStoredValue(localStorage.getItem(loanInterestRateCacheKey) || sessionStorage.getItem(loanInterestRateCacheKey));
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue as Record<string, number> : {};
  } catch {
    return {};
  }
}

function writeLoanInterestRateCache(cache: Record<string, number>): void {
  const serializedCache = JSON.stringify(cache);
  localStorage.setItem(loanInterestRateCacheKey, serializedCache);
  sessionStorage.setItem(loanInterestRateCacheKey, serializedCache);
}

function readLoanRepaymentStartDateCache(): Record<string, string> {
  const rawValue = normalizeStoredValue(localStorage.getItem(loanRepaymentStartDateCacheKey) || sessionStorage.getItem(loanRepaymentStartDateCacheKey));
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeLoanRepaymentStartDateCache(cache: Record<string, string>): void {
  const serializedCache = JSON.stringify(cache);
  localStorage.setItem(loanRepaymentStartDateCacheKey, serializedCache);
  sessionStorage.setItem(loanRepaymentStartDateCacheKey, serializedCache);
}

function readLoanStatusNoteEntry(
  cache: Record<string, Record<string, string>>,
  loan: Pick<LoanApplication, 'id' | 'loanCode'>
): Record<string, string> {
  const loanId = Number(loan.id || 0);
  const loanCode = String(loan.loanCode || '').trim();
  const entry = cache[`id:${loanId}`] || cache[`code:${loanCode}`] || {};
  return entry && typeof entry === 'object' ? entry : {};
}

function readLoanStatusNoteCache(): Record<string, Record<string, string>> {
  const rawValue = normalizeStoredValue(localStorage.getItem(loanStatusNoteCacheKey) || sessionStorage.getItem(loanStatusNoteCacheKey));
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object'
      ? parsedValue as Record<string, Record<string, string>>
      : {};
  } catch {
    return {};
  }
}

function writeLoanStatusNoteCache(cache: Record<string, Record<string, string>>): void {
  const serializedCache = JSON.stringify(cache);
  localStorage.setItem(loanStatusNoteCacheKey, serializedCache);
  sessionStorage.setItem(loanStatusNoteCacheKey, serializedCache);
}

function parseStoredJson(value: string | null): Record<string, unknown> | null {
  const normalizedValue = normalizeStoredValue(value);
  if (!normalizedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(normalizedValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function normalizeStoredValue(value: string | null | undefined): string {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue || normalizedValue === 'undefined' || normalizedValue === 'null') {
    return '';
  }

  return normalizedValue;
}

function normalizeSortValue(value: string | number | null | undefined): string {
  return String(value ?? '').trim();
}

function resolveDepartmentDisplay(department?: unknown): string {
  if (department == null) {
    return '';
  }

  if (typeof department === 'string') {
    return department.trim();
  }

  if (typeof department === 'number' || typeof department === 'boolean') {
    return String(department).trim();
  }

  if (typeof department !== 'object') {
    return '';
  }

  const departmentRecord = department as Record<string, unknown>;
  const candidateKeys = ['name', 'departmentName', 'title', 'label', 'unit', 'value'];

  for (const key of candidateKeys) {
    const candidateValue = departmentRecord[key];
    if (typeof candidateValue === 'string' && candidateValue.trim()) {
      return candidateValue.trim();
    }
  }

  if (departmentRecord['department']) {
    return resolveDepartmentDisplay(departmentRecord['department']);
  }

  return '';
}

function parseSortableNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.replace(/,/g, '');

  if (!/^-?\d+(\.\d+)?$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}