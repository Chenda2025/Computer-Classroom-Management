export type PermAction = 'view' | 'insert' | 'write' | 'delete';
// Each module stores a set of independently enabled actions
export type PermMap = Record<string, PermAction[]>;

export const PERM_ACTIONS: { value: PermAction; label: string; color: string; bg: string; border: string }[] = [
  { value: 'view',   label: 'មើល',    color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'insert', label: 'បន្ថែម', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  { value: 'write',  label: 'កែប្រែ', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { value: 'delete', label: 'លុប',    color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
];

export const MODULES = [
  { key: 'students',       label: 'បញ្ជីសិស្ស',    icon: '👨‍🎓', group: 'ការគ្រប់គ្រង' },
  { key: 'teachers',       label: 'បញ្ជីគ្រូ',      icon: '👨‍🏫', group: 'ការគ្រប់គ្រង' },
  { key: 'classes',        label: 'ថ្នាក់រៀន',       icon: '🏫',  group: 'ការគ្រប់គ្រង' },
  { key: 'courses',        label: 'វគ្គសិក្សា',      icon: '📚',  group: 'ការគ្រប់គ្រង' },
  { key: 'attendance',     label: 'វត្តមាន',         icon: '✅',  group: 'ការគ្រប់គ្រង' },
  { key: 'exams',          label: 'ការប្រឡង',        icon: '📝',  group: 'ការប្រឡង' },
  { key: 'exam-requests',  label: 'ស្នើរសូម',        icon: '📋',  group: 'ការប្រឡង' },
  { key: 'exam-reports',   label: 'របាយការណ៍',       icon: '📊',  group: 'ការប្រឡង' },
  { key: 'schedule',       label: 'កាលវិភាគ',        icon: '📅',  group: 'ផ្សេងៗ' },
  { key: 'pagodas',        label: 'បញ្ជីវត្ត',       icon: '🛕',  group: 'ផ្សេងៗ' },
  { key: 'portfolios',     label: 'ស្នាដៃសិស្ស',     icon: '🗂️',  group: 'ផ្សេងៗ' },
  { key: 'certificates',   label: 'វិញ្ញាបនបត្រ',    icon: '🎓',  group: 'ផ្សេងៗ' },
] as const;

export type ModuleKey = typeof MODULES[number]['key'];

export function parsePermissions(raw: string | null | undefined): PermMap {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function has(perms: PermMap, module: string, action: PermAction): boolean {
  return Array.isArray(perms[module]) && perms[module].includes(action);
}

export function canView(perms: PermMap, module: string, role: string): boolean {
  if (role === 'ADMIN') return true;
  return has(perms, module, 'view');
}

export function canInsert(perms: PermMap, module: string, role: string): boolean {
  if (role === 'ADMIN') return true;
  return has(perms, module, 'insert');
}

export function canWrite(perms: PermMap, module: string, role: string): boolean {
  if (role === 'ADMIN') return true;
  return has(perms, module, 'write');
}

export function canDelete(perms: PermMap, module: string, role: string): boolean {
  if (role === 'ADMIN') return true;
  return has(perms, module, 'delete');
}
