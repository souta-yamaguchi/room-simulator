// Cloudflare Pages Function: 管理者がブラウザから現在のレイアウトを直接 GitHub に
// commit する経路。GitHub の push を Cloudflare Pages が検知して自動再デプロイし、
// 訪問者URLに反映される。
//
// 必要な環境変数 (Cloudflare Pages > Settings > Environment variables, 全て暗号化):
//   GITHUB_TOKEN   : Fine-grained PAT (Contents: Read & write)
//   GITHUB_REPO    : "souta-yamaguchi/room-simulator"
//   GITHUB_BRANCH  : "main"
//   ADMIN_PASSWORD : 山口さんが決める管理者パスワード。管理者ログイン時の認証値と同じ
//                    (管理者UIからログインで保存された値を X-Deploy-Key として送信)

const TARGET_PATH = 'public/default_layout.json';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// payload が「家具レイアウトJSON」として最低限の体裁であるか軽く検証する。
// 内容の正しさまでは見ない（家具配置のセマンティクスは管理者の責任）。
function validatePayload(p) {
  if (!p || typeof p !== 'object') return 'payload is not an object';
  if (!p.room || typeof p.room !== 'object') return 'missing room';
  if (!Array.isArray(p.furniture)) return 'furniture is not an array';
  if (p.visitorNpcPatterns != null && !Array.isArray(p.visitorNpcPatterns)) {
    return 'visitorNpcPatterns is not an array';
  }
  return null;
}

// 文字列を Base64 にエンコード (UTF-8 経由)
function toBase64(str) {
  // Cloudflare Workers は btoa を提供するが UTF-8 を扱えないので TextEncoder 経由
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function onRequestPost({ request, env }) {
  // --- 認可: 管理者ログインで使ったパスワードが localStorage 経由で送られてくる
  const key = request.headers.get('X-Deploy-Key');
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse(500, { ok: false, error: 'server: ADMIN_PASSWORD not configured' });
  }
  if (!key || key !== env.ADMIN_PASSWORD) {
    return jsonResponse(401, { ok: false, error: 'invalid password (please re-login)' });
  }

  // --- ペイロード取得
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid JSON body' });
  }
  const validationError = validatePayload(payload);
  if (validationError) {
    return jsonResponse(400, { ok: false, error: validationError });
  }

  // --- 環境変数チェック
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH = 'main' } = env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return jsonResponse(500, {
      ok: false,
      error: 'server: GITHUB_TOKEN or GITHUB_REPO not configured',
    });
  }

  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${TARGET_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'room-simulator-deploy',
  };

  // --- 既存ファイルの SHA を取得 (新規ファイル時は存在しないので 404 を許容)
  let currentSha = null;
  try {
    const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
      headers: ghHeaders,
    });
    if (getRes.ok) {
      const cur = await getRes.json();
      currentSha = cur.sha;
    } else if (getRes.status !== 404) {
      const text = await getRes.text();
      return jsonResponse(502, {
        ok: false,
        error: `GitHub GET failed: ${getRes.status} ${text.slice(0, 200)}`,
      });
    }
  } catch (e) {
    return jsonResponse(502, { ok: false, error: `GitHub GET error: ${e.message}` });
  }

  // --- PUT で更新 (sha を渡せば上書き、無ければ新規作成)
  const newContent = JSON.stringify(payload, null, 2) + '\n';
  const body = {
    message: `Update default_layout.json via admin UI (${new Date().toISOString()})`,
    content: toBase64(newContent),
    branch: GITHUB_BRANCH,
  };
  if (currentSha) body.sha = currentSha;

  try {
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      const text = await putRes.text();
      return jsonResponse(502, {
        ok: false,
        error: `GitHub PUT failed: ${putRes.status} ${text.slice(0, 400)}`,
      });
    }
    const result = await putRes.json();
    return jsonResponse(200, {
      ok: true,
      commit: result.commit?.sha,
      url: result.commit?.html_url,
    });
  } catch (e) {
    return jsonResponse(502, { ok: false, error: `GitHub PUT error: ${e.message}` });
  }
}

// GET など他メソッドは 405
export async function onRequest({ request }) {
  if (request.method === 'POST') return; // onRequestPost に委譲
  return jsonResponse(405, { ok: false, error: 'method not allowed' });
}
