export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Protège tout sauf : login/register, les assets Next.js, l'API NextAuth
     * et les endpoints cron (protégés par leur propre secret partagé).
     */
    '/((?!login|register|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)',
  ],
};
