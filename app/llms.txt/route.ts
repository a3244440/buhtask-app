import { buildLlmsTxt } from '@/lib/llmsContent';

// Статический текстовый файл для ИИ-ассистентов; собирается при деплое из данных страниц услуг.
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
