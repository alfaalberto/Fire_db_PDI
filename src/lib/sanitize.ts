export function sanitizeHtml(input: string): string {
  // Very basic sanitizer: remove <script>...</script> and inline event handlers on*=
  // For production, prefer a battle-tested library (e.g., DOMPurify) served locally.
  if (!input) return '';
  let out = input;
  const preservedScripts: string[] = [];
  out = out.replace(/<script\b[^>]*type\s*=\s*['"]math\/tex[^>]*>[\s\S]*?<\/script>/gi, (match) => {
    preservedScripts.push(match);
    return `__PRESERVED_MATH_SCRIPT_${preservedScripts.length - 1}__`;
  });
  // Remove script tags (except preserved math/tex scripts)
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove on* attributes like onclick, onload
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
  out = out.replace(/__PRESERVED_MATH_SCRIPT_(\d+)__/g, (_, idx) => {
    const i = Number(idx);
    return Number.isFinite(i) && preservedScripts[i] ? preservedScripts[i] : '';
  });
  return out;
}
