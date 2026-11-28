/**
 * The interface shows model text as plain text, so markdown emphasis would appear as literal asterisks.
 * Passage numbers ("Sumber [2]") only mean something inside the prompt, so they are removed as well.
 */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, "$1")
    .replace(/(?<![\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/g, "$1")
    .replace(/(^|[.?!]\s+)(?:Dari|Berdasarkan|Menurut)\s+Sumber\s*\[\d+\]\s*,\s*(\p{L})/giu, (_, start: string, first: string) => start + first.toUpperCase())
    .replace(/,?\s*(?:(?:seperti|sebagaimana)\s+)?(?:yang\s+)?(?:dijelaskan\s+|disebutkan\s+)?(?:dalam|di|pada|menurut)\s+Sumber\s*\[\d+\]\s*,?/gi, "")
    .replace(/\s*[([]?Sumber\s*\[\d+\][)\]]?/gi, "")
    .trim();
}
