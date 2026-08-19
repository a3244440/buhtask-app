// Лёгкий markdown → HTML рендерер без внешних зависимостей.
// Поддерживает: ## заголовки, **жирный**, *курсив*, - списки, [ссылки](url), абзацы.
// Экранирует HTML заранее, чтобы контент из админки не мог вставить произвольный <script>.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  let t = escapeHtml(text);
  // [текст](https://...) — только http(s)-ссылки, чтобы исключить javascript: и подобные схемы
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer nofollow" class="text-blue-600 hover:underline">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  return t;
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      html.push(`<ul class="list-disc pl-5 space-y-1 my-4">${listBuffer.join('')}</ul>`);
      listBuffer = [];
    }
  };

  let paraBuffer: string[] = [];
  const flushPara = () => {
    if (paraBuffer.length) {
      html.push(`<p class="my-4 leading-relaxed">${paraBuffer.join(' ')}</p>`);
      paraBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }

    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const li = line.match(/^[-*]\s+(.*)/);

    if (h2) { flushPara(); flushList(); html.push(`<h2 class="text-xl font-bold mt-8 mb-3">${inline(h2[1])}</h2>`); continue; }
    if (h3) { flushPara(); flushList(); html.push(`<h3 class="text-lg font-bold mt-6 mb-2">${inline(h3[1])}</h3>`); continue; }
    if (li) { flushPara(); listBuffer.push(`<li>${inline(li[1])}</li>`); continue; }

    flushList();
    paraBuffer.push(inline(line));
  }
  flushPara();
  flushList();
  return html.join('\n');
}

/** Обычный текст без разметки — для превью/OG-описаний. */
export function stripMarkdown(md: string, maxLen = 160): string {
  const plain = md
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen - 1).trimEnd() + '…' : plain;
}

/** Грубая оценка времени чтения в минутах — для UX, не требует точности. */
export function readingTime(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}
