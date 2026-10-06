const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const id = '00000000-0000-0000-0000-000000000001';
function harness(options = {}) {
  const events = [];
  const request = { id, user_id: 'target', status: 'pending', ...options.request };
  const db = {
    from(table) {
      let isUpdate = false, lookup;
      const query = {
        select() { return this; },
        eq(column, value) { if (column === 'id') lookup = value; return this; },
        update() { isUpdate = true; events.push('approve'); return this; },
        async maybeSingle() {
          if (table === 'profiles') return { data: { role: lookup === 'admin' ? (options.callerRole || 'admin') : (options.targetRole || 'client') } };
          return { data: isUpdate ? { id } : request, error: isUpdate ? options.auditError : null };
        }
      };
      return query;
    },
    async rpc() { events.push('files'); return { data: options.files || [], error: options.filesError }; },
    storage: { from() { return { async remove(paths) { events.push(['remove', paths.length]); return { error: options.storageError }; } }; } },
    auth: { admin: { async deleteUser() { events.push('auth'); return { error: options.authError }; } } }
  };
  const code = ts.transpileModule(readFileSync('app/api/account/delete/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Map, console: { error() {} },
    require(name) {
      if (name === 'next/server') return { NextResponse: Response };
      return { supabaseAdmin: () => db, getAuthenticatedUser: async () => options.unauthorized ? null : { id: 'admin' } };
    }
  });
  return { events, run: body => exports.POST(new Request('https://example.com/api/account/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || { requestId: id })
  })) };
}

test('deletion removes Storage in batches, then Auth, then approves', async () => {
  const h = harness({ files: Array.from({ length: 205 }, (_, n) => ({ bucket_id: 'avatars', name: String(n) })) });
  assert.equal((await h.run()).status, 200);
  assert.deepEqual(h.events, ['files', ['remove', 100], ['remove', 100], ['remove', 5], 'auth', 'approve']);
});
for (const failure of ['filesError', 'storageError', 'authError']) {
  test(`${failure} leaves request unapproved for retry`, async () => {
    const h = harness({ [failure]: { message: 'failed' }, files: [{ bucket_id: 'avatars', name: 'file' }] });
    assert.equal((await h.run()).status, 500);
    assert.equal(h.events.includes('approve'), false);
  });
}
test('audit retry with deleted user completes without deleting again', async () => {
  const h = harness({ request: { user_id: null } });
  assert.equal((await h.run()).status, 200);
  assert.deepEqual(h.events, ['approve']);
});
test('audit failure reports a retryable error', async () => {
  const h = harness({ auditError: { message: 'failed' } });
  assert.equal((await h.run()).status, 500);
  assert.deepEqual(h.events, ['files', 'auth', 'approve']);
});
for (const [name, options, status] of [
  ['unauthenticated', { unauthorized: true }, 401],
  ['non-admin', { callerRole: 'client' }, 403],
  ['admin target', { targetRole: 'admin' }, 403],
  ['self-deletion', { request: { user_id: 'admin' } }, 403],
  ['rejected request', { request: { status: 'rejected' } }, 409],
  ['already approved', { request: { status: 'approved' } }, 200]
]) {
  test(name, async () => {
    const h = harness(options);
    assert.equal((await h.run()).status, status);
    assert.deepEqual(h.events, []);
  });
}
test('invalid UUID rejected before any deletion', async () => {
  const h = harness();
  assert.equal((await h.run({ requestId: 'bad-id' })).status, 400);
  assert.deepEqual(h.events, []);
});
