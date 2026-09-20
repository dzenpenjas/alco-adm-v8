import assert from 'assert';
import { DOCUMENT_CATALOG } from '../src/services/documentEngine';
import { createDocumentSnapshot, compareDocumentSnapshots } from '../src/services/documentEngine/snapshot';

async function runHardeningRegressionTests() {
  console.log('=== RUNNING PRE-USER-TEST HARDENING REGRESSION SUITE ===\n');

  // 1. Verify DOCUMENT_CATALOG terminology
  const atpCatalog = DOCUMENT_CATALOG.find((c) => c.type === 'ATP');
  assert.ok(atpCatalog, 'ATP catalog item exists');
  assert.ok(
    atpCatalog.description.includes('Dimensi Profil Lulusan'),
    `ATP description should contain 'Dimensi Profil Lulusan', got: ${atpCatalog.description}`
  );
  assert.ok(
    !atpCatalog.description.includes('Profil Pelajar Pancasila'),
    'ATP description should NOT contain legacy "Profil Pelajar Pancasila"'
  );

  const asesmenCatalog = DOCUMENT_CATALOG.find((c) => c.type === 'ASESMEN');
  assert.ok(asesmenCatalog, 'ASESMEN catalog item exists');
  assert.ok(
    asesmenCatalog.description.includes('Dimensi Profil Lulusan'),
    `ASESMEN description should contain 'Dimensi Profil Lulusan', got: ${asesmenCatalog.description}`
  );

  console.log('[PASS] 1. DOCUMENT_CATALOG uses current 2026 terminology (Dimensi Profil Lulusan)');

  // 2. Verify Snapshot comparison does not default missing curriculum to "Kurikulum Merdeka"
  const emptySnapA = createDocumentSnapshot({
    academicSetting: {
      id: 'setting-1',
      profileId: 'prof-1',
      level: 'SD',
      academicYear: '',
      semester: '' as any,
      grade: '',
      subject: '',
      curriculum: '',
      curriculumType: '' as any,
      phase: '',
      updatedAt: new Date().toISOString(),
    } as any,
    profile: { id: 'prof-1', name: '', nip: '', status: 'PNS', defaultSubject: '', defaultLevel: 'SD', createdAt: '', updatedAt: '' } as any,
    school: { id: 'sch-1', name: '', npsn: '', address: '', village: '', district: '', regency: '', province: '', principalName: '', principalNip: '', principalSource: '' } as any,
  });

  const emptySnapB = createDocumentSnapshot({
    academicSetting: {
      id: 'setting-2',
      profileId: 'prof-2',
      level: 'SD',
      academicYear: '',
      semester: '' as any,
      grade: '',
      subject: '',
      curriculum: '',
      curriculumType: '' as any,
      phase: '',
      updatedAt: new Date().toISOString(),
    } as any,
    profile: { id: 'prof-2', name: '', nip: '', status: 'PNS', defaultSubject: '', defaultLevel: 'SD', createdAt: '', updatedAt: '' } as any,
    school: { id: 'sch-2', name: '', npsn: '', address: '', village: '', district: '', regency: '', province: '', principalName: '', principalNip: '', principalSource: '' } as any,
  });

  const comparison = compareDocumentSnapshots(emptySnapA, emptySnapB);
  const currField = comparison.fields.find((f) => f.key === 'curriculum');
  assert.ok(currField, 'Curriculum field exists in snapshot comparison');
  assert.strictEqual(currField.valueA, '-', 'Missing curriculum A should be rendered as "-"');
  assert.strictEqual(currField.valueB, '-', 'Missing curriculum B should be rendered as "-"');

  console.log('[PASS] 2. Snapshot comparison renders missing curriculum as "-" (NO fake "Kurikulum Merdeka")');

  // 3. Verify server endpoints (dry simulation of request/response parameters)
  // We check that server file does not contain hardcoded default string injections like "'Kelas 4'" or "'Bahasa Indonesia'" in AI prompt strings
  const fs = await import('fs');
  const serverCode = fs.readFileSync('server.ts', 'utf-8');

  assert.ok(
    !serverCode.includes("`${subject || 'Mata Pelajaran'}`"),
    'server.ts analyze-cp should not inject default "Mata Pelajaran"'
  );
  assert.ok(
    !serverCode.includes("`${grade || 'Kelas 4'}`"),
    'server.ts analyze-cp should not inject default "Kelas 4"'
  );
  assert.ok(
    !serverCode.includes("`${subject || 'Bahasa Indonesia'}`"),
    'server.ts generate-atp should not inject default "Bahasa Indonesia"'
  );
  assert.ok(
    !serverCode.includes("`${academicYear || '2025/2026'}`"),
    'server.ts generate-atp should not inject default "2025/2026"'
  );

  console.log('[PASS] 3. server.ts AI prompts audited and confirmed free of silent fake default injections');

  // 4. Verify terminology "Murid" & "Dimensi Profil Lulusan" in server prompts
  assert.ok(
    serverCode.includes('Gunakan terminologi "Murid"'),
    'server.ts prompt instructs AI to use "Murid"'
  );
  assert.ok(
    serverCode.includes('Dimensi Profil Lulusan'),
    'server.ts prompt instructs AI to use "Dimensi Profil Lulusan"'
  );

  console.log('[PASS] 4. server.ts AI prompts enforce "Murid" and "Dimensi Profil Lulusan" terminology');

  console.log('\nAll Pre-User-Test Hardening regression tests PASSED successfully!');
}

runHardeningRegressionTests().catch((err) => {
  console.error('Hardening regression test failed:', err);
  process.exit(1);
});
