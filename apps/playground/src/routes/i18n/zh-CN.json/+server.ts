import { json, type RequestHandler } from '@sveltejs/kit';
import crypto from 'node:crypto';

const dict = {
  hello: '你好，{name}！',
  'save.ok': '已保存。'
};

export const GET: RequestHandler = ({ request }) => {
  const raw = JSON.stringify(dict);
  const etag = '"' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16) + '"';
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });
  return json(dict, { headers: { ETag: etag, 'Cache-Control': 'no-store' } });
};
