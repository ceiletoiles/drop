import { sanitizeFilename } from '../../shared/utils';

export { sanitizeFilename };

export type FileTypeKind =
  | 'note'
  | 'txt'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'lua'
  | 'r'
  | 'shell'
  | 'powershell'
  | 'sql'
  | 'html'
  | 'css'
  | 'config'
  | 'app'
  | 'font'
  | 'design'
  | 'generic';

export interface ResolveFileTypeInput {
  filename?: string | null;
  extension?: string | null;
  mimeType?: string | null;
  itemType?: 'text' | 'file' | null;
}

interface FileTypeMeta {
  label: string;
  toneClass: string;
  shortLabel: string;
}

const FILE_TYPE_META: Record<FileTypeKind, FileTypeMeta> = {
  note: { label: 'Text', toneClass: 'bg-amber-50 text-amber-500', shortLabel: 'Note' },
  txt: { label: 'TXT', toneClass: 'bg-sky-50 text-sky-500', shortLabel: 'TXT' },
  pdf: { label: 'PDF', toneClass: 'bg-rose-50 text-rose-500', shortLabel: 'PDF' },
  word: { label: 'Word', toneClass: 'bg-blue-50 text-blue-500', shortLabel: 'DOC' },
  excel: { label: 'Spreadsheet', toneClass: 'bg-emerald-50 text-emerald-500', shortLabel: 'XLS' },
  powerpoint: { label: 'PowerPoint', toneClass: 'bg-orange-50 text-orange-500', shortLabel: 'PPT' },
  image: { label: 'Image', toneClass: 'bg-emerald-50 text-emerald-500', shortLabel: 'IMG' },
  video: { label: 'Video', toneClass: 'bg-violet-50 text-violet-500', shortLabel: 'VID' },
  audio: { label: 'Audio', toneClass: 'bg-fuchsia-50 text-fuchsia-500', shortLabel: 'AUD' },
  archive: { label: 'Archive', toneClass: 'bg-slate-100 text-slate-600', shortLabel: 'ZIP' },
  javascript: { label: 'JavaScript', toneClass: 'bg-amber-50 text-amber-500', shortLabel: 'JS' },
  typescript: { label: 'TypeScript', toneClass: 'bg-blue-50 text-blue-500', shortLabel: 'TS' },
  python: { label: 'Python', toneClass: 'bg-yellow-50 text-yellow-600', shortLabel: 'PY' },
  java: { label: 'Java', toneClass: 'bg-red-50 text-red-500', shortLabel: 'JAVA' },
  c: { label: 'C', toneClass: 'bg-slate-100 text-slate-600', shortLabel: 'C' },
  cpp: { label: 'C++', toneClass: 'bg-slate-100 text-slate-600', shortLabel: 'C++' },
  csharp: { label: 'C#', toneClass: 'bg-purple-50 text-purple-500', shortLabel: 'C#' },
  go: { label: 'Go', toneClass: 'bg-cyan-50 text-cyan-600', shortLabel: 'GO' },
  rust: { label: 'Rust', toneClass: 'bg-orange-50 text-orange-600', shortLabel: 'RS' },
  php: { label: 'PHP', toneClass: 'bg-indigo-50 text-indigo-500', shortLabel: 'PHP' },
  ruby: { label: 'Ruby', toneClass: 'bg-red-50 text-red-500', shortLabel: 'RB' },
  swift: { label: 'Swift', toneClass: 'bg-orange-50 text-orange-500', shortLabel: 'SW' },
  kotlin: { label: 'Kotlin', toneClass: 'bg-purple-50 text-purple-500', shortLabel: 'KT' },
  dart: { label: 'Dart', toneClass: 'bg-sky-50 text-sky-500', shortLabel: 'DART' },
  lua: { label: 'Lua', toneClass: 'bg-indigo-50 text-indigo-500', shortLabel: 'LUA' },
  r: { label: 'R', toneClass: 'bg-blue-50 text-blue-500', shortLabel: 'R' },
  shell: { label: 'Shell', toneClass: 'bg-emerald-50 text-emerald-500', shortLabel: 'SH' },
  powershell: { label: 'PowerShell', toneClass: 'bg-blue-50 text-blue-500', shortLabel: 'PS1' },
  sql: { label: 'SQL', toneClass: 'bg-cyan-50 text-cyan-600', shortLabel: 'SQL' },
  html: { label: 'HTML', toneClass: 'bg-orange-50 text-orange-500', shortLabel: 'HTML' },
  css: { label: 'CSS', toneClass: 'bg-sky-50 text-sky-500', shortLabel: 'CSS' },
  config: { label: 'Data', toneClass: 'bg-slate-100 text-slate-600', shortLabel: 'CFG' },
  app: { label: 'App', toneClass: 'bg-fuchsia-50 text-fuchsia-500', shortLabel: 'APP' },
  font: { label: 'Font', toneClass: 'bg-teal-50 text-teal-500', shortLabel: 'Aa' },
  design: { label: 'Design', toneClass: 'bg-pink-50 text-pink-500', shortLabel: 'DES' },
  generic: { label: 'File', toneClass: 'bg-rose-50 text-rose-500', shortLabel: 'FILE' }
};

const compoundExtensions = ['tar.gz', 'tar.bz2', 'tar.xz', 'd.ts'] as const;

const extensionKindMap: Record<string, FileTypeKind> = {
  txt: 'txt',
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  'tar.gz': 'archive',
  'tar.bz2': 'archive',
  'tar.xz': 'archive',
  'd.ts': 'typescript',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  avif: 'image',
  bmp: 'image',
  ico: 'image',
  tiff: 'image',
  tif: 'image',
  mp4: 'video',
  mkv: 'video',
  mov: 'video',
  avi: 'video',
  webm: 'video',
  flv: 'video',
  wmv: 'video',
  m4v: 'video',
  '3gp': 'video',
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  aac: 'audio',
  opus: 'audio',
  wma: 'audio',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
  xz: 'archive',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  sh: 'shell',
  bash: 'shell',
  ps1: 'powershell',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  json: 'config',
  xml: 'config',
  yaml: 'config',
  yml: 'config',
  toml: 'config',
  ini: 'config',
  env: 'config',
  exe: 'app',
  msi: 'app',
  apk: 'app',
  dmg: 'app',
  deb: 'app',
  rpm: 'app',
  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
  psd: 'design',
  ai: 'design',
  fig: 'design',
  sketch: 'design'
};

const mimeTypeKindMap: Array<[RegExp, FileTypeKind]> = [
  [/^image\//, 'image'],
  [/^video\//, 'video'],
  [/^audio\//, 'audio'],
  [/pdf/, 'pdf'],
  [/wordprocessingml/, 'word'],
  [/spreadsheetml/, 'excel'],
  [/presentationml/, 'powerpoint'],
  [/csv/, 'excel'],
  [/text\/plain/, 'txt'],
  [/zip|compressed|x-7z|x-rar|gzip|x-tar/, 'archive'],
  [/javascript|ecmascript/, 'javascript'],
  [/typescript/, 'typescript'],
  [/python/, 'python'],
  [/java/, 'java'],
  [/csharp|dotnet/, 'csharp'],
  [/powerShell/i, 'powershell'],
  [/sql/, 'sql'],
  [/html/, 'html'],
  [/css/, 'css'],
  [/json|yaml|xml|toml|ini|env/, 'config'],
  [/font|font-ttf|font-otf|woff/, 'font'],
  [/photoshop|illustrator|figma|sketch/, 'design']
];

export const getFileExtension = (filename?: string | null) => {
  if (!filename) return '';

  const normalized = filename.trim().toLowerCase();
  if (!normalized) return '';

  for (const compoundExtension of compoundExtensions) {
    if (normalized.endsWith(`.${compoundExtension}`)) {
      return compoundExtension;
    }
  }

  const lastDot = normalized.lastIndexOf('.');
  if (lastDot < 0 || lastDot === normalized.length - 1) return '';
  return normalized.slice(lastDot + 1);
};

export const getFileTypeKind = ({
  filename,
  extension,
  mimeType,
  itemType
}: ResolveFileTypeInput = {}): FileTypeKind => {
  if (itemType === 'text') return 'note';

  const normalizedExtension = (extension ?? getFileExtension(filename)).trim().toLowerCase();
  if (normalizedExtension && normalizedExtension in extensionKindMap) {
    return extensionKindMap[normalizedExtension];
  }

  const normalizedMimeType = mimeType?.trim().toLowerCase() ?? '';
  if (normalizedMimeType) {
    for (const [pattern, kind] of mimeTypeKindMap) {
      if (pattern.test(normalizedMimeType)) {
        return kind;
      }
    }
  }

  return 'generic';
};

export const getFileTypeLabel = (input: ResolveFileTypeInput = {}) => FILE_TYPE_META[getFileTypeKind(input)].label;

export const getFileTypeShortLabel = (input: ResolveFileTypeInput = {}) =>
  FILE_TYPE_META[getFileTypeKind(input)].shortLabel;

export const getFileTypeToneClass = (input: ResolveFileTypeInput = {}) =>
  FILE_TYPE_META[getFileTypeKind(input)].toneClass;

export const getFileTypeMeta = (input: ResolveFileTypeInput = {}) => {
  const kind = getFileTypeKind(input);
  return {
    kind,
    ...FILE_TYPE_META[kind]
  };
};

export const isImageFile = (input: ResolveFileTypeInput = {}) => getFileTypeKind(input) === 'image';
