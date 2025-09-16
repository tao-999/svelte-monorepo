import { json, type RequestHandler } from '@sveltejs/kit';
import crypto from 'node:crypto';

const body = {
  version: new Date().toISOString(), // 改这个就会触发热更新
  locales: {
    en:   { url: '/i18n/en.json' },
    'zh-CN': { url: '/i18n/zh-CN.json' }
  }
};

export const GET: RequestHandler = ({ request }) => {
  const raw = JSON.stringify(body);
  const etag = '"' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16) + '"';
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304 });
  }
  return json(body, { headers: { ETag: etag, 'Cache-Control': 'no-store' } });
};
