export function sanitizeHtml(input: string): string {
  // Very basic sanitizer: remove <script>...</script> and inline event handlers on*=
  // For production, prefer a battle-tested library (e.g., DOMPurify) served locally.
  if (!input) return '';
  let out = input;
  // Remove script tags
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove on* attributes like onclick, onload
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
  return out;
}
