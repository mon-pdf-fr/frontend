import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Function to detect bots
function isBot(userAgent: string | null) {
  if (!userAgent) return false;
  return /bot|crawl|spider|bing|google|vercel-favicon|GPTBot|Go-http-client/i.test(userAgent);
}

// Original next-intl middleware
const intlMiddleware = createMiddleware({
  locales: locales as unknown as string[],
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Wrapped middleware
export default function middleware(req: NextRequest) {
  const userAgent = req.headers.get('user-agent');
  const bot = isBot(userAgent);

  // Run the next-intl middleware first
  const res = intlMiddleware(req) as NextResponse;

  // Add custom header to mark human vs bot
  if (!bot) {
    res.headers.set('x-human-visit', 'true');
  } else {
    res.headers.set('x-human-visit', 'false');
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'], // keep your original matcher
};
