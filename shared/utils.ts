const isInvalidFilenameChar = (char: string) => {
  const code = char.charCodeAt(0);
  return (
    char === '\\' ||
    char === '/' ||
    char === ':' ||
    char === '*' ||
    char === '?' ||
    char === '"' ||
    char === '<' ||
    char === '>' ||
    char === '|' ||
    code < 32
  );
};

export const sanitizeFilename = (value: string) =>
  value
    .split('')
    .map((char) => (isInvalidFilenameChar(char) ? '_' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'download';
