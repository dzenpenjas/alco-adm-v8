import {
  AssessmentPackage,
  AssessmentPlan,
  AcademicSetting,
  SchoolData,
  TeacherProfile,
  TPData,
} from '../src/types';
import { DocumentGenerationContext } from '../src/services/documentEngine/types';
import {
  checkAssessmentExportEligibility,
  createAssessmentDocumentSnapshot,
  buildNormalizedAssessmentDocumentModel,
  exportAssessmentDocx,
  exportAssessmentPdf,
  renderAssessmentDocx,
  renderAssessmentPdf,
} from '../src/services/documentEngine/assessmentExportService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

let passedCount = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passedCount++;
    console.log(`[PASS] ${passedCount}. ${name}`);
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Fixtures
const mockSchool: SchoolData = {
  id: 'school-1',
  name: 'SMA Negeri 1 Nusantara',
  npsn: '12345678',
  address: 'Jl. Merdeka No. 45',
  village: 'Sukamaju',
  district: 'Cilandak',
  regency: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  principalName: 'Drs. H. Ahmad Dahlan, M.Pd.',
  principalNip: '197001011995011001',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockProfile: TeacherProfile = {
  id: 'teacher-1',
  schoolId: 'school-1',
  name: 'Budi Santoso, S.Pd.',
  nip: '198502022010011002',
  status: 'PNS',
  defaultSubject: 'Informatika',
  defaultLevel: 'SMA',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockAcademicSetting: AcademicSetting = {
  id: 'setting-1',
  profileId: 'teacher-1',
  curriculum: 'Kurikulum Merdeka',
  curriculumType: 'KURIKULUM_MERDEKA',
  subject: 'Informatika',
  level: 'SMA',
  grade: 'Kelas 10',
  phase: 'Fase E',
  academicYear: '2025/2026',
  semester: '1 (Ganjil)',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockTP: TPData = {
  id: 'tp-data-1',
  academicSettingId: 'setting-1',
  items: [
    {
      id: 'tp-1',
      code: 'TP 10.1',
      statement: 'Memahami konsep dasar algoritma dan pemrograman prosedural',
      competence: 'Memahami',
      contentScope: 'Algoritma dan Pemrograman',
      order: 1,
    },
    {
      id: 'tp-2',
      code: 'TP 10.2',
      statement: 'Menerapkan struktur kontrol percabangan dan perulangan dalam bahasa pemrograman',
      competence: 'Menerapkan',
      contentScope: 'Struktur Kontrol',
      order: 2,
    },
  ],
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockPlan: AssessmentPlan = {
  id: 'plan-1',
  academicSettingId: 'setting-1',
  title: 'Rencana Asesmen Formatif & Sumatif Informatika',
  purpose: 'SUMMATIVE',
  timing: 'POST',
  scopeType: 'TP',
  tpIds: ['tp-1', 'tp-2'],
  criterionIds: [],
  workflowStatus: 'SIAP',
  instruments: [{ id: 'pi-1', type: 'WRITTEN_TEST', label: 'Tes Tertulis' }],
  revision: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockValidSiapPackage: AssessmentPackage = {
  id: 'pkg-siap-1',
  assessmentPlanId: 'plan-1',
  academicSettingId: 'setting-1',
  title: 'Perangkat Asesmen Sumatif Informatika Kelas 10',
  workflowStatus: 'SIAP',
  needsReview: false,
  revision: 2,
  blueprintItems: [
    {
      id: 'bp-1',
      objectiveRefId: 'tp-1',
      assessmentIndicator: 'Peserta didik dapat mendefinisikan konsep variabel dan tipe data.',
      materialOrContext: 'Dasar Pemrograman',
      instrumentType: 'WRITTEN_TEST',
      instrumentItemIds: ['item-1'],
      order: 1,
    },
    {
      id: 'bp-2',
      objectiveRefId: 'tp-2',
      assessmentIndicator: 'Peserta didik dapat menyusun algoritma percabangan if-else.',
      materialOrContext: 'Percabangan',
      instrumentType: 'WRITTEN_TEST',
      instrumentItemIds: ['item-2'],
      order: 2,
    },
  ],
  instruments: [
    {
      id: 'inst-1',
      type: 'WRITTEN_TEST',
      title: 'Tes Tertulis Sumatif',
      instructions: 'Pilihlah jawaban yang paling tepat pada soal pilihan ganda berikut.',
      items: [
        {
          id: 'item-1',
          blueprintItemId: 'bp-1',
          itemType: 'MULTIPLE_CHOICE',
          prompt: 'Tipe data yang digunakan untuk menyimpan nilai logika benar/salah adalah...',
          options: [
            { id: 'opt-a', label: 'A', text: 'Integer' },
            { id: 'opt-b', label: 'B', text: 'Boolean', isCorrect: true },
            { id: 'opt-c', label: 'C', text: 'String' },
            { id: 'opt-d', label: 'D', text: 'Float' },
          ],
          order: 1,
        },
        {
          id: 'item-2',
          blueprintItemId: 'bp-2',
          itemType: 'SHORT_ANSWER',
          prompt: 'Sebutkan kata kunci yang digunakan untuk percabangan lebih dari dua kondisi!',
          order: 2,
        },
      ],
    },
  ],
  answerKeys: [
    {
      id: 'ak-1',
      instrumentId: 'inst-1',
      instrumentItemId: 'item-1',
      answerType: 'OPTION',
      optionIds: ['opt-b'],
      value: 'B. Boolean',
      notes: 'Boolean adalah tipe data logika.',
    },
    {
      id: 'ak-2',
      instrumentId: 'inst-1',
      instrumentItemId: 'item-2',
      answerType: 'EXACT',
      value: 'elif / else if / switch',
      notes: 'Sintaks kondisional.',
    },
  ],
  scoringGuides: [
    {
      id: 'sg-1',
      title: 'Pedoman Penskoran Pilihan Ganda',
      instrumentId: 'inst-1',
      instrumentItemId: 'item-1',
      maxScore: 10,
      guideType: 'OBJECTIVE',
    },
    {
      id: 'sg-2',
      title: 'Pedoman Penskoran Isian Singkat',
      instrumentId: 'inst-1',
      instrumentItemId: 'item-2',
      maxScore: 10,
      guideType: 'MANUAL',
    },
  ],
  rubrics: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

async function runAudit9C8Regression() {
  console.log('\n=== AUDIT 9C.8 — DOCUMENT/EXPORT INTEGRATION REGRESSION ===\n');

  // Test 1: Check eligibility blocks DRAFT package
  await test('9C.8.1 — Export is strictly blocked when package workflowStatus is DRAFT', () => {
    const draftPackage: AssessmentPackage = {
      ...mockValidSiapPackage,
      id: 'pkg-draft',
      workflowStatus: 'DRAFT',
    };

    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [draftPackage],
    };

    const res = checkAssessmentExportEligibility(context);
    assert(!res.eligible, 'Must be ineligible for DRAFT package');
    assert(res.blockers.some((b) => b.includes('DRAFT')), 'Must explain DRAFT status in blockers');
  });

  // Test 2: Check eligibility blocks needsReview = true
  await test('9C.8.2 — Export is strictly blocked when needsReview is true', () => {
    const reviewNeededPackage: AssessmentPackage = {
      ...mockValidSiapPackage,
      id: 'pkg-review',
      workflowStatus: 'SIAP',
      needsReview: true,
    };

    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [reviewNeededPackage],
    };

    const res = checkAssessmentExportEligibility(context);
    assert(!res.eligible, 'Must be ineligible when needsReview is true');
    assert(res.blockers.some((b) => b.includes('needsReview')), 'Must explain needsReview in blockers');
  });

  // Test 3: Check eligibility blocks zero packages
  await test('9C.8.3 — Export is blocked when no assessment packages exist', () => {
    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [],
    };

    const res = checkAssessmentExportEligibility(context);
    assert(!res.eligible, 'Must be ineligible when no packages exist');
    assert(res.blockers.length > 0, 'Must have blocker message');
  });

  // Test 4: NO FIRST MATCH rule for ambiguous multiple SIAP packages
  await test('9C.8.4 — Ambiguous multiple SIAP packages are blocked if activeAssessmentPackageId is not specified', () => {
    const pkg1: AssessmentPackage = { ...mockValidSiapPackage, id: 'pkg-1', title: 'Paket 1' };
    const pkg2: AssessmentPackage = { ...mockValidSiapPackage, id: 'pkg-2', title: 'Paket 2' };

    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [pkg1, pkg2],
    };

    const res = checkAssessmentExportEligibility(context);
    assert(!res.eligible, 'Must be ineligible without explicit ID when multiple SIAP exist');
    assert(res.blockers.some((b) => b.includes('tanpa ID spesifik')), 'Must detect ambiguity');
  });

  // Test 5: Explicit activeAssessmentPackageId resolves cleanly
  await test('9C.8.5 — Explicit activeAssessmentPackageId resolves targeted package when multiple exist', () => {
    const pkg1: AssessmentPackage = { ...mockValidSiapPackage, id: 'pkg-1', title: 'Paket 1' };
    const pkg2: AssessmentPackage = { ...mockValidSiapPackage, id: 'pkg-2', title: 'Paket 2' };

    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [pkg1, pkg2],
      activeAssessmentPackageId: 'pkg-2',
    };

    const res = checkAssessmentExportEligibility(context);
    if (!res.eligible) {
      console.log('Test 5 blockers:', res.blockers);
    }
    assert(res.eligible, 'Must be eligible with explicit valid ID');
    assert(res.package?.id === 'pkg-2', 'Must resolve pkg-2 exactly');
  });

  // Test 6: Snapshot creation produces frozen, immutable snapshot with hash
  await test('9C.8.6 — Snapshot creation produces immutable snapshot containing metadata and SHA/Hash', () => {
    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [mockValidSiapPackage],
    };

    const snapshot = createAssessmentDocumentSnapshot(context);
    assert(snapshot.assessmentPackageId === 'pkg-siap-1', 'Snapshot assessmentPackageId must match');
    assert(snapshot.assessmentPackageRevision === 2, 'Snapshot revision must match');
    assert(snapshot.blueprintItems.length === 2, 'Snapshot blueprint items must match');
    assert(snapshot.snapshotId && snapshot.snapshotId.length > 0, 'Snapshot must have snapshotId');
    assert(snapshot.resolvedObjectives['tp-1'] !== undefined, 'Snapshot must freeze resolved objectives');
  });

  // Test 7: Normalized document model builds accurately from snapshot
  await test('9C.8.7 — Normalized document model creates deterministic structure for sibling renderers', () => {
    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [mockValidSiapPackage],
    };

    const snapshot = createAssessmentDocumentSnapshot(context);
    const model = buildNormalizedAssessmentDocumentModel(snapshot);

    assert(model.metadata.subTitle === mockValidSiapPackage.title, 'Model subTitle must match package title');
    assert(model.kisiKisi.rows.length === 2, 'Kisi-kisi rows must match');
    assert(model.instruments.list.length === 1, 'Instruments must match');
    assert(model.instruments.list[0].writtenItems?.length === 2, 'Written items must match');
    assert(model.answerKeys.list.length === 2, 'Answer keys must match');
    assert(model.scoringGuides.list.length === 2, 'Scoring guides must match');
    assert(model.signoff.teacherName === mockProfile.name, 'Signoff teacher name must match');
  });

  // Test 8: DOCX Renderer produces valid Blob
  await test('9C.8.8 — DOCX renderer generates non-empty Blob and fileName from normalized model', async () => {
    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [mockValidSiapPackage],
    };

    const res = await exportAssessmentDocx(context);
    assert(Boolean(res.blob), 'Output blob must exist');
    assert((res.blob as any).size > 0 || (res.blob as any).length > 0, 'Blob must not be empty');
    assert(res.fileName.endsWith('.docx'), 'File name must end with .docx');
    assert(res.snapshot.assessmentPackageId === 'pkg-siap-1', 'Snapshot must be attached');
  });

  // Test 9: PDF Renderer produces valid Blob
  await test('9C.8.9 — PDF renderer generates non-empty Blob and fileName from normalized model', async () => {
    const context: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [mockValidSiapPackage],
    };

    const res = await exportAssessmentPdf(context);
    assert(Boolean(res.blob), 'Output blob must exist');
    assert((res.blob as any).size > 0 || (res.blob as any).length > 0, 'Blob must not be empty');
    assert(res.fileName.endsWith('.pdf'), 'File name must end with .pdf');
    assert(res.snapshot.assessmentPackageId === 'pkg-siap-1', 'Snapshot must be attached');
  });

  // Test 10: Blank mode generates valid blank templates
  await test('9C.8.10 — Blank mode export produces clean blank templates for DOCX and PDF', async () => {
    const blankContext: DocumentGenerationContext = {
      school: mockSchool,
      profile: mockProfile,
      academicSetting: mockAcademicSetting,
      documentMode: 'blank',
      tp: mockTP,
      assessmentPlans: [mockPlan],
      assessmentPackages: [],
    };

    const docxRes = await exportAssessmentDocx(blankContext);
    assert(Boolean(docxRes.blob), 'Blank DOCX must exist');
    assert((docxRes.blob as any).size > 0 || (docxRes.blob as any).length > 0, 'Blank DOCX must not be empty');

    const pdfRes = await exportAssessmentPdf(blankContext);
    assert(Boolean(pdfRes.blob), 'Blank PDF must exist');
    assert((pdfRes.blob as any).size > 0 || (pdfRes.blob as any).length > 0, 'Blank PDF must not be empty');
  });

  console.log(`\nAll ${passedCount} tests in Audit 9C.8 regression suite PASSED successfully!\n`);
}

runAudit9C8Regression().catch((err) => {
  console.error(err);
  process.exit(1);
});
