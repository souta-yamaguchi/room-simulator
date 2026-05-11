// Cloudflare Pages Function: 管理者ログイン
// クライアントから送られた password を env.ADMIN_PASSWORD と照合する。
// 一致したら 200 を返し、クライアントは localStorage に password を保存する。
// 以降の管理者UI / 本番反映ボタンはこの localStorage 値を使う。

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse(500, {
      ok: false,
      error: 'server: ADMIN_PASSWORD not configured in Cloudflare environment variables',
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid JSON body' });
  }
  const pwd = (body?.password || '').toString();
  if (!pwd) return jsonResponse(400, { ok: false, error: 'password missing' });

  if (pwd !== env.ADMIN_PASSWORD) {
    return jsonResponse(401, { ok: false, error: 'incorrect password' });
  }

  return jsonResponse(200, { ok: true });
}

export async function onRequest({ request }) {
  if (request.method === 'POST') return;
  return jsonResponse(405, { ok: false, error: 'method not allowed' });
}
