import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const names = [
  'ណារ សុវណ្ណ', 'ដារ៉ា ចន្ទ', 'វ៉ាន់ ណារ៉ា', 'ហ៊ុន សំណាង', 'ទូច ពិសិដ្ឋ',
  'ម៉ាន់ ដារ៉ុង', 'ខេន ច័ន្ទ', 'ស៊ូ សុខ', 'ព្រំ ណាត', 'ជ័យ ណារ',
  'សុភា ណ', 'ចន្ទ្រា ស', 'លក្ខណ៍ ព', 'ស្រីពេជ្រ ណ', 'ស្រីនាត ម',
  'ហេង ណ', 'ណន ស', 'ចន ព', 'ត ក', 'ន ម',
];

const genders   = ['M','M','M','M','M','M','M','F','F','F','M','F','F','F','F','M','M','M','M','M'];
const subjects  = ['គណិតវិទ្យា','ភាសាខ្មែរ','ភាសាអង់គ្លេស','វិទ្យាសាស្ត្រ','ប្រវត្តិវិទ្យា','ភូមិវិទ្យា','អក្សរសាស្ត្រ','សិល្បៈ','កម្ពស់ IT','ក្រមសីលធម៌'];
const phones    = ['012','015','016','017','070','071','086','089','093','096'];

function pad(n)    { return String(n).padStart(3,'0'); }
function randDob() {
  const y = 1975 + Math.floor(Math.random() * 25);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2,'0');
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function randPhone(pfx) { return pfx + ' ' + String(100000 + Math.floor(Math.random() * 899999)); }
function pick(arr, i)   { return arr[i % arr.length]; }

const TODAY = new Date();
const DATE_STR = `${TODAY.getFullYear()}${String(TODAY.getMonth()+1).padStart(2,'0')}${String(TODAY.getDate()).padStart(2,'0')}`;

async function main() {
  const existing = await prisma.teacher.findMany({ select: { teacherCode: true } });
  const usedCodes = new Set(existing.map(t => t.teacherCode));

  let maxSeq = 0;
  for (const code of usedCodes) {
    const m = code.match(/^TCH-\d{8}-(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }

  const data = [];
  for (let i = 0; i < 20; i++) {
    maxSeq++;
    data.push({
      teacherCode:  `TCH-${DATE_STR}-${pad(maxSeq)}`,
      name:         names[i],
      gender:       genders[i],
      dateOfBirth:  randDob(),
      phone:        randPhone(pick(phones, i)),
      nationality:  'ខ្មែរ',
      subject:      pick(subjects, i),
    });
  }

  const result = await prisma.teacher.createMany({ data, skipDuplicates: true });
  console.log(`✅ Inserted ${result.count} teachers. Total: ${await prisma.teacher.count()}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
