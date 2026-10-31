/**
 * End-to-end smoke test of every write path, against a RUNNING server and the real Supabase project.
 *
 *   npm run dev                                   # in another terminal
 *   npm run smoke                                 # defaults to http://localhost:4000/api
 *   SMOKE_API_URL=http://<host>:4000/api npm run smoke
 *
 * Works in a random empty spot of the South Pacific so it never touches demo data, uses a
 * throwaway auth user, and deletes everything it created (rows, photos, user) at the end.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { env } from '../src/config/env.js';
import { supabase } from '../src/config/supabase.js';
import { boundingBox } from '../src/lib/geo.js';
import { IMAGE_BUCKET } from '../src/services/image.service.js';

const API = (process.env.SMOKE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const METRE_LAT = 1 / 111_320;

// Random origin so parallel/repeated runs never see each other's issues.
const ORIGIN = { lat: -40 - Math.random() * 5, lng: -130 - Math.random() * 5 };
const at = (northM: number, eastM = 0) => ({
  lat: ORIGIN.lat + northM * METRE_LAT,
  lng: ORIGIN.lng + eastM * (METRE_LAT / Math.cos((ORIGIN.lat * Math.PI) / 180)),
});

const TEXT = {
  base: 'Huge pothole outside the bakery damaging car tyres every day',
  merge: 'Huge pothole outside the bakery is damaging car tyres every day', // ≥ 0.75 vs base
  vague: 'Pothole near the bakery damaging cars daily', // 0.50–0.75 vs base
  drainFar: 'Blocked drain overflowing onto the street after heavy rain',
  drainNear: 'Blocked drain overflowing onto street after the heavy rain', // 0.94 vs drainFar
};

// ── tiny test harness ────────────────────────────────────────────────────────

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok || detail === undefined ? '' : ` — got ${JSON.stringify(detail)}`}`);
}
function section(title: string) {
  console.log(`\n${title}`);
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function call(method: string, path: string, token?: string, body?: FormData | Json) {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const isJson = body !== undefined && !(body instanceof FormData);
  if (isJson) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: isJson ? JSON.stringify(body) : body,
  });
  return { status: res.status, body: (await res.json()) as Json };
}

let photo: Buffer;
interface ReportFields {
  category: string;
  description: string;
  pos: { lat: number; lng: number };
  confirm_issue_id?: string;
  force_new?: boolean;
}
function report(fields: ReportFields, token?: string) {
  const form = new FormData();
  form.set('category', fields.category);
  form.set('description', fields.description);
  form.set('latitude', String(fields.pos.lat));
  form.set('longitude', String(fields.pos.lng));
  if (fields.confirm_issue_id) form.set('confirm_issue_id', fields.confirm_issue_id);
  if (fields.force_new) form.set('force_new', 'true');
  form.set('photo', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'photo.jpg');
  return call('POST', '/issues', token, form);
}

// ── direct DB helpers (setup + assertions + cleanup) ─────────────────────────

async function resolveIssue(id: string) {
  const { error } = await supabase
    .from('issues')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`resolve failed: ${error.message}`);
}

async function insertIssue(category: string, description: string, pos: { lat: number; lng: number }): Promise<string> {
  const { data, error } = await supabase
    .from('issues')
    .insert({ category, title: 'smoke', description, latitude: pos.lat, longitude: pos.lng })
    .select('id')
    .single();
  if (error) throw new Error(`insert failed: ${error.message}`);
  return data.id;
}

async function evidenceRows(issueId: string): Promise<number> {
  const { count } = await supabase.from('evidence').select('*', { count: 'exact', head: true }).eq('issue_id', issueId);
  return count ?? 0;
}

async function areaCounts() {
  const box = boundingBox(ORIGIN.lat, ORIGIN.lng, 500);
  const { data } = await supabase
    .from('issues')
    .select('id, evidence:evidence(count)')
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng);
  const rows = (data ?? []) as { id: string; evidence: { count: number }[] }[];
  return { issues: rows.length, evidence: rows.reduce((n, r) => n + (r.evidence[0]?.count ?? 0), 0) };
}

async function newestPhoto(): Promise<string | undefined> {
  const { data } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
  return data?.[0]?.name;
}

async function createTestUser(): Promise<{ id: string; token: string }> {
  const email = `smoke-${Date.now()}@citizensignal.test`;
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  // An admin magic link works whatever login providers are enabled.
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError) throw new Error(`generateLink failed: ${linkError.message}`);
  // Sign in on a separate client: verifyOtp stores the session on the client it runs on, which
  // would make the shared service-role client act as this user (and hit row-level security).
  const signInClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: otpError } = await signInClient.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  });
  if (otpError || !session.session) throw new Error(`verifyOtp failed: ${otpError?.message}`);
  return { id: data.user.id, token: session.session.access_token };
}

async function cleanup(userId?: string) {
  const box = boundingBox(ORIGIN.lat, ORIGIN.lng, 500);
  const { data: issues } = await supabase
    .from('issues')
    .select('id, image_url, evidence(image_url)')
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng);
  const rows = (issues ?? []) as { id: string; image_url: string | null; evidence: { image_url: string | null }[] }[];
  const marker = `/${IMAGE_BUCKET}/`;
  const paths = rows
    .flatMap((r) => [r.image_url, ...r.evidence.map((e) => e.image_url)])
    .filter((u): u is string => !!u && u.includes(marker))
    .map((u) => u.slice(u.indexOf(marker) + marker.length));

  if (rows.length) await supabase.from('issues').delete().in('id', rows.map((r) => r.id)); // cascades
  if (paths.length) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (userId) await supabase.auth.admin.deleteUser(userId);
  console.log(`\n🧹  Cleaned up ${rows.length} issues, ${paths.length} photos${userId ? ', test user' : ''}`);
}

// ── the tests ────────────────────────────────────────────────────────────────

async function run(user: { id: string; token: string }) {
  const { token } = user;

  section('Report → created (Sharp + storage)');
  const created = await report({ category: 'pothole', description: TEXT.base, pos: at(0) }, token);
  check('201 created', created.status === 201 && created.body.outcome === 'created', created);
  const p1 = created.body.issue;
  check('evidence_count 1, recurrence 0, open', p1?.evidence_count === 1 && p1?.recurrence_count === 0 && p1?.status === 'open', p1);
  const img = await fetch(p1.image_url);
  const meta = await sharp(Buffer.from(await img.arrayBuffer())).metadata();
  check('photo is public', img.ok, img.status);
  check('photo stored as WebP', meta.format === 'webp', meta.format);
  check('EXIF-rotated + shrunk to fit 1280 px (3000×2000 rot90 → 853×1280)', meta.width === 853 && meta.height === 1280, [meta.width, meta.height]);

  section('Report → merged (auto, ≥ 0.75 and ≤ 25 m)');
  const merged = await report({ category: 'pothole', description: TEXT.merge, pos: at(10) }, token);
  check('outcome merged into same issue', merged.body.outcome === 'merged' && merged.body.issue?.id === p1.id, merged.body);
  check('evidence_count 2', merged.body.issue?.evidence_count === 2, merged.body.issue?.evidence_count);

  section('Report → needs_confirmation saves nothing');
  const before = { ...(await areaCounts()), photo: await newestPhoto() };
  const vague = await report({ category: 'pothole', description: TEXT.vague, pos: at(5) }, token);
  check('outcome needs_confirmation (200)', vague.status === 200 && vague.body.outcome === 'needs_confirmation', vague.body);
  const cand = vague.body.candidates?.[0];
  check('candidate has text_score + distance_m', cand?.id === p1.id && cand.text_score >= 0.5 && cand.text_score < 0.75 && typeof cand.distance_m === 'number', cand);
  const after = { ...(await areaCounts()), photo: await newestPhoto() };
  check('no issue/evidence row and no photo written', JSON.stringify(before) === JSON.stringify(after), { before, after });

  section('Confirm flow');
  const confirmed = await report({ category: 'pothole', description: TEXT.vague, pos: at(5), confirm_issue_id: p1.id }, token);
  check('confirm_issue_id → merged, evidence 3', confirmed.body.outcome === 'merged' && confirmed.body.issue?.evidence_count === 3, confirmed.body);
  const forced = await report({ category: 'pothole', description: TEXT.vague, pos: at(5), force_new: true }, token);
  check('force_new → created (201), new id', forced.status === 201 && forced.body.outcome === 'created' && forced.body.issue?.id !== p1.id, forced.body);
  const missing = await report(
    { category: 'pothole', description: TEXT.vague, pos: at(5), confirm_issue_id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b' },
    token,
  );
  check('confirm unknown id → 404 NOT_FOUND', missing.status === 404 && missing.body.error?.code === 'NOT_FOUND', missing);

  section('Report → reopened (headline feature)');
  await resolveIssue(p1.id);
  const reopened = await report({ category: 'pothole', description: TEXT.merge, pos: at(3) }, token);
  const r = reopened.body.issue;
  check('outcome reopened, same issue', reopened.body.outcome === 'reopened' && r?.id === p1.id, reopened.body);
  check('status open, recurrence 1, reopened_at set, evidence 4', r?.status === 'open' && r?.recurrence_count === 1 && !!r?.reopened_at && r?.evidence_count === 4, r);

  await resolveIssue(p1.id);
  const confirmReopen = await report({ category: 'pothole', description: TEXT.vague, pos: at(5), confirm_issue_id: p1.id }, token);
  check('confirm_issue_id onto resolved → reopened, recurrence 2', confirmReopen.body.outcome === 'reopened' && confirmReopen.body.issue?.recurrence_count === 2, confirmReopen.body);

  section('Detail endpoint');
  const detail = await call('GET', `/issues/${p1.id}`, token);
  check('evidence list length = evidence_count − 1', detail.body.evidence?.length === detail.body.issue?.evidence_count - 1, [detail.body.evidence?.length, detail.body.issue?.evidence_count]);
  check('no created_by leaked', !('created_by' in (detail.body.issue ?? {})) && !('created_by' in (detail.body.evidence?.[0] ?? {})));

  section('Concurrency (counters never lose increments)');
  const parallel = await Promise.all([0, 1, 2].map(() => report({ category: 'pothole', description: TEXT.merge, pos: at(4) }, token)));
  check('3 parallel merges all succeed', parallel.every((p) => p.body.outcome === 'merged'), parallel.map((p) => p.body.outcome ?? p.body));
  const stored = (await call('GET', `/issues/${p1.id}`)).body.issue;
  check('evidence_count = 1 + evidence rows', stored.evidence_count === 1 + (await evidenceRows(p1.id)), [stored.evidence_count, await evidenceRows(p1.id)]);

  await resolveIssue(p1.id);
  const race = await Promise.all([0, 1, 2].map(() => report({ category: 'pothole', description: TEXT.merge, pos: at(4) }, token)));
  const outcomes = race.map((p) => p.body.outcome);
  check('3 parallel reports on a resolved issue → exactly one reopened', outcomes.filter((o) => o === 'reopened').length === 1 && outcomes.filter((o) => o === 'merged').length === 2, outcomes);
  const afterRace = (await call('GET', `/issues/${p1.id}`)).body.issue;
  check('recurrence_count went up by exactly 1 (2 → 3)', afterRace.recurrence_count === 3, afterRace.recurrence_count);
  check('evidence_count still = 1 + rows', afterRace.evidence_count === 1 + (await evidenceRows(p1.id)), afterRace.evidence_count);

  section('Matching: auto-merge picks a close match over a better-worded far one');
  const far = await insertIssue('drainage', TEXT.drainFar, at(200, 40));
  const near = await insertIssue('drainage', TEXT.drainNear, at(200, 10));
  const edge = await report({ category: 'drainage', description: TEXT.drainFar, pos: at(200) }, token);
  check('merged into the 10 m issue, not asked about the 40 m one', edge.body.outcome === 'merged' && edge.body.issue?.id === near, { outcome: edge.body.outcome, id: edge.body.issue?.id, near, far });

  section('Upvotes');
  const noAuth = await call('POST', `/issues/${p1.id}/upvote`);
  check('401 without token', noAuth.status === 401 && noAuth.body.error?.code === 'UNAUTHORIZED', noAuth);
  const up = await call('POST', `/issues/${p1.id}/upvote`, token);
  check('upvote → 1, has_upvoted', up.status === 200 && up.body.issue?.upvotes === 1 && up.body.issue?.has_upvoted === true, up.body);
  const dup = await call('POST', `/issues/${p1.id}/upvote`, token);
  check('duplicate upvote → 200, still 1 (no 500)', dup.status === 200 && dup.body.issue?.upvotes === 1, dup);
  const burst = await Promise.all([0, 1, 2].map(() => call('POST', `/issues/${forced.body.issue.id}/upvote`, token)));
  check('3 parallel upvotes by one user → 1', burst.every((b) => b.status === 200) && (await call('GET', `/issues/${forced.body.issue.id}`)).body.issue.upvotes === 1, burst.map((b) => b.status));
  const list = await call('GET', `/issues?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&radius_m=300`, token);
  const listed = list.body.issues?.find((i: Json) => i.id === p1.id);
  check('list shows has_upvoted with token', listed?.has_upvoted === true, listed?.has_upvoted);
  const anonList = await call('GET', `/issues?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&radius_m=300`);
  check('list shows has_upvoted=false without token', anonList.body.issues?.find((i: Json) => i.id === p1.id)?.has_upvoted === false);
  const down = await call('DELETE', `/issues/${p1.id}/upvote`, token);
  check('unvote → 0', down.body.issue?.upvotes === 0 && down.body.issue?.has_upvoted === false, down.body);
  const down2 = await call('DELETE', `/issues/${p1.id}/upvote`, token);
  check('unvote again → 200, still 0', down2.status === 200 && down2.body.issue?.upvotes === 0, down2);

  section('Comments');
  const noAuthComment = await call('POST', `/issues/${p1.id}/comments`, undefined, { body: 'Still there this morning' });
  check('401 without token', noAuthComment.status === 401 && noAuthComment.body.error?.code === 'UNAUTHORIZED', noAuthComment);
  const blank = await call('POST', `/issues/${p1.id}/comments`, token, { body: '   ' });
  check('blank comment → 400 VALIDATION_ERROR on body', blank.status === 400 && blank.body.error?.details?.[0]?.field === 'body', blank);
  const posted = await call('POST', `/issues/${p1.id}/comments`, token, { body: '  Still there this morning  ', user_id: 'spoofed' });
  const comment = posted.body.comment;
  check('201, trimmed, is_mine, author from token', posted.status === 201 && comment?.body === 'Still there this morning' && comment?.is_mine === true && typeof comment?.author === 'string', posted);
  check('no user_id leaked', !('user_id' in (comment ?? {})));
  const anonComments = await call('GET', `/issues/${p1.id}/comments`);
  check('public list, is_mine=false without token', anonComments.body.comments?.length === 1 && anonComments.body.comments[0].is_mine === false, anonComments.body);
  const withCount = (await call('GET', `/issues/${p1.id}`)).body.issue;
  check('issue comment_count = 1', withCount.comment_count === 1, withCount.comment_count);
  const missingIssue = await call('GET', '/issues/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b/comments');
  check('comments of unknown issue → 404', missingIssue.status === 404, missingIssue.status);

  section('Anonymous report + /issues/mine');
  const anon = await report({ category: 'garbage', description: 'Garbage piled up beside the school gate for a week', pos: at(-150) });
  check('logged-out report works (optional auth)', anon.status === 201, anon);
  const badToken = await report({ category: 'streetlight', description: 'Streetlight flickering all night at the corner', pos: at(-300) }, 'not-a-token');
  check('invalid token on report → still accepted anonymously', badToken.status === 201, badToken.status);
  await report({ category: 'garbage', description: 'Garbage piled up beside the school gate for a week', pos: at(-150), confirm_issue_id: anon.body.issue.id }, token);
  const mine = await call('GET', '/issues/mine', token);
  const role = (id: string) => mine.body.issues?.find((i: Json) => i.id === id)?.my_role;
  check('own issue → reporter', role(p1.id) === 'reporter', role(p1.id));
  check("merged into someone else's → contributor", role(anon.body.issue.id) === 'contributor', role(anon.body.issue.id));
  check('logged-out issue not listed as mine otherwise', role(badToken.body.issue.id) === undefined);
  check('newest own activity first', mine.body.issues?.[0]?.id === anon.body.issue.id, mine.body.issues?.map((i: Json) => i.id));
}

async function main() {
  console.log(`🔎  Smoke test against ${API} at ${ORIGIN.lat.toFixed(4)}, ${ORIGIN.lng.toFixed(4)}`);
  const health = await fetch(`${API}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`Server not reachable at ${API} — start it with \`npm run dev\``);

  // 3000×2000 JPEG tagged "rotate 90°", so the stored photo proves Sharp rotated + resized it.
  photo = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#8d6e63' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  let user: { id: string; token: string } | undefined;
  try {
    user = await createTestUser();
    await run(user);
  } finally {
    await cleanup(user?.id);
  }
  console.log(failures ? `\n❌  ${failures} check(s) failed` : '\n✅  All checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error('❌  Smoke test crashed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
