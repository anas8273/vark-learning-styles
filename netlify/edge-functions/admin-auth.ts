import type { Config, Context } from '@netlify/edge-functions';

function constantTimeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (request: Request, context: Context) => {
  const expected = String(Netlify.env.get('ADMIN_PIN') || '');
  const supplied = String(request.headers.get('x-admin-pin') || '');

  if (!expected) {
    return Response.json({ error: 'لم يتم ضبط رمز دخول المعلمة في إعدادات الموقع.' }, { status: 503 });
  }

  if (!constantTimeEqual(expected, supplied)) {
    return Response.json({ error: 'رمز دخول المعلمة غير صحيح.' }, { status: 401 });
  }

  return context.next();
};

export const config: Config = {
  path: '/api/admin/*',
};
