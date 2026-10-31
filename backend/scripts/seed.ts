/**
 * Seed script: inserts repeatable demo data — one resolved pothole + 3 neighbours.
 * Run with: npm run seed
 *
 * Clears existing issues, evidence, and upvotes before inserting.
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function seed() {
  console.log('🌱  Clearing existing data…');
  await supabase.from('upvotes').delete().neq('issue_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('evidence').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const BASE_LAT = 28.6139;
  const BASE_LNG = 77.2090;

  console.log('🌱  Inserting seed issues…');

  // 1. Resolved pothole — the hero of the demo
  const { data: resolved, error: e1 } = await supabase
    .from('issues')
    .insert({
      category: 'pothole',
      title: 'Pothole: Large pothole causing vehicle damage',
      description: 'Large pothole causing serious vehicle damage and flat tyres near the junction',
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      status: 'resolved',
      upvotes: 8,
      evidence_count: 3,
      recurrence_count: 0,
      resolved_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (e1) throw e1;
  console.log('  ✓ resolved pothole:', resolved.id);

  // 2. Open pothole next door (high priority)
  const { data: open1, error: e2 } = await supabase
    .from('issues')
    .insert({
      category: 'pothole',
      title: 'Pothole: Deep pothole on main road',
      description: 'Deep pothole on main road causing traffic slowdown near signal',
      latitude: BASE_LAT + 0.00015,
      longitude: BASE_LNG + 0.00010,
      status: 'open',
      upvotes: 5,
      evidence_count: 2,
      recurrence_count: 1,
    })
    .select()
    .single();
  if (e2) throw e2;
  console.log('  ✓ open pothole:', open1.id);

  // 3. Streetlight — open
  const { data: light, error: e3 } = await supabase
    .from('issues')
    .insert({
      category: 'streetlight',
      title: 'Streetlight: Broken streetlight on lane 4',
      description: 'Broken streetlight making lane 4 completely dark and unsafe at night',
      latitude: BASE_LAT + 0.0003,
      longitude: BASE_LNG - 0.0002,
      status: 'open',
      upvotes: 3,
      evidence_count: 1,
      recurrence_count: 0,
    })
    .select()
    .single();
  if (e3) throw e3;
  console.log('  ✓ streetlight:', light.id);

  // 4. Garbage — open, aging
  const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: garbage, error: e4 } = await supabase
    .from('issues')
    .insert({
      category: 'garbage',
      title: 'Garbage: Overflowing garbage bin',
      description: 'Overflowing garbage bin not cleared in two weeks causing foul smell',
      latitude: BASE_LAT - 0.0004,
      longitude: BASE_LNG + 0.0003,
      status: 'open',
      upvotes: 12,
      evidence_count: 4,
      recurrence_count: 2,
      created_at: oldDate,
    })
    .select()
    .single();
  if (e4) throw e4;
  console.log('  ✓ garbage:', garbage.id);

  console.log('\n✅  Seed complete. Run `npm run dev` and point the app at this data.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
