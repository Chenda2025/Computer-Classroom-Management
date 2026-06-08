import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pagodas = ['និរោធរង្សី', 'ប្រជុំវង្ស', 'កំសាន្ត', 'ឬស្សីស្រស់', 'កោះនរា', 'ច្បារអំពៅ'];

const levels = [
  { level: 'បឋមសិក្សា',    grades: ['ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣'] },
  { level: 'អនុវិទ្យាល័យ', grades: ['ថ្នាក់៧', 'ថ្នាក់៨', 'ថ្នាក់៩'] },
  { level: 'វទ្យាល័យ',     grades: ['ថ្នាក់១០', 'ថ្នាក់១១', 'ថ្នាក់១២'] },
  { level: 'មហាវិទ្យាល័យ', grades: ['ឆ្នាំទី១', 'ឆ្នាំទី២', 'ឆ្នាំទី៣', 'ឆ្នាំទី៤'] },
];

const academicYears = ['2024-2025', '2025-2026', '2026-2027'];

const maleNames = [
  'ណារ សុវណ្ណ', 'ដារ៉ា ចន្ទ', 'វ៉ាន់ ណារ៉ា', 'ហ៊ុន សំណាង', 'ទូច ពិសិដ្ឋ',
  'ម៉ាន់ ដារ៉ុង', 'ខេន ច័ន្ទ', 'ស៊ូ សុខ', 'ព្រំ ណាត', 'ជ័យ ណារ',
  'ស៊ុន ភ័ក្រ', 'លី សោម', 'ភ្នំ វ', 'ម៉ោ ណ', 'ហ ចន្ទ',
  'ហេង ណ', 'ណន ស', 'ចន ព', 'ត ក', 'ន ម',
  'ស ព', 'ភ ជ', 'ជ ត', 'ក ណ', 'ម ស',
  'ហ ន', 'ន ភ', 'ព ជ', 'ត ស', 'ណ ក',
  'សុខ វ', 'វ ហ', 'ស ជ', 'ណ ន', 'ភ ន',
  'ជ ស', 'ត ព', 'ក វ', 'ម ជ', 'ហ ត',
];

const femaleNames = [
  'សុភា ណ', 'ចន្ទ្រា ស', 'ណ ព', 'ស ល', 'ល ណ',
  'ព ស', 'ជ ណ', 'ណ ស', 'ស ជ', 'ម ណ',
];

const kutis   = ['កុដិA', 'កុដិB', 'កុដិC', 'កុដិD', 'កុដិE'];
const kutiHeads = ['ព្រះ ណារ', 'ព្រះ ស', 'ព្រះ ម', 'ព្រះ ជ', 'ព្រះ វ'];
const phones  = ['012','015','016','017','070','071','086','089','093','096'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function padNum(n) { return String(n).padStart(3, '0'); }
function randDob() {
  const y = 1998 + Math.floor(Math.random() * 14);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function randPhone(prefix) {
  return prefix + ' ' + String(100000 + Math.floor(Math.random() * 899999));
}

async function main() {
  // Find highest existing code number to avoid collisions
  const existing = await prisma.student.findMany({
    select: { studentCode: true },
    orderBy: { studentCode: 'desc' },
  });
  const usedCodes = new Set(existing.map(s => s.studentCode));

  // Find the max sequence number used today
  const TODAY = '20260606';
  let maxSeq = 0;
  for (const code of usedCodes) {
    const m = code.match(/^STU-\d{8}-(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }

  const students = [];
  for (let i = 0; i < 50; i++) {
    maxSeq++;
    const code = `STU-${TODAY}-${padNum(maxSeq)}`;
    const gender = Math.random() < 0.82 ? 'M' : 'F';
    const name = gender === 'M'
      ? maleNames[i % maleNames.length]
      : femaleNames[i % femaleNames.length];
    const lvlObj = pick(levels);
    students.push({
      studentCode:   code,
      name,
      gender,
      dateOfBirth:   randDob(),
      phone:         randPhone(pick(phones)),
      nationality:   'ខ្មែរ',
      wat:           pick(pagodas),
      kuti:          pick(kutis),
      kutiHead:      pick(kutiHeads),
      academicYear:  pick(academicYears),
      educationLevel: lvlObj.level,
      grade:         pick(lvlObj.grades),
    });
  }

  const result = await prisma.student.createMany({
    data: students,
    skipDuplicates: true,   // never overwrites existing rows
  });

  console.log(`✅ Inserted ${result.count} new students (skipped duplicates).`);
  console.log(`   Total now: ${await prisma.student.count()}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
