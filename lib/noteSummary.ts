type SummaryOptions = {
  maxHeadings?: number;
  maxLength?: number;
};

export type SmartNoteSummary = {
  headings: string[];
  leadParagraph: string;
  preview: string;
};

const DEFAULT_MAX_HEADINGS = 2;
const DEFAULT_MAX_LENGTH = 190;

export function stripHtmlToText(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function shorten(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength).trimEnd()}...`;
}

function cleanMatchText(input: string): string {
  return stripHtmlToText(input).replace(/\s+/g, ' ').trim();
}

function extractHeadingTexts(content: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(content)) !== null) {
    const cleaned = cleanMatchText(match[1] || '');
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function extractLeadParagraph(content: string): string {
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let firstNonEmpty = '';

  let match: RegExpExecArray | null;
  while ((match = paragraphRegex.exec(content)) !== null) {
    const cleaned = cleanMatchText(match[1] || '');
    if (!cleaned) continue;
    if (!firstNonEmpty) firstNonEmpty = cleaned;
    if (cleaned.length >= 24) return cleaned;
  }

  if (firstNonEmpty) return firstNonEmpty;
  return stripHtmlToText(content);
}

export function buildSmartSummary(content: string, options: SummaryOptions = {}): SmartNoteSummary {
  const maxHeadings = options.maxHeadings ?? DEFAULT_MAX_HEADINGS;
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;

  const allHeadings = extractHeadingTexts(content);
  const headings = allHeadings.slice(0, Math.max(0, maxHeadings));
  const leadParagraph = extractLeadParagraph(content);

  const headingPart = headings.join(' | ');
  const previewBase = headingPart && leadParagraph
    ? `${headingPart} - ${leadParagraph}`
    : headingPart || leadParagraph;

  return {
    headings,
    leadParagraph,
    preview: shorten(previewBase, maxLength),
  };
}
