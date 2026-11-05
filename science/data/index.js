/* 單元目錄：unit.html 只會載入這裡登記過的單元（避免任意路徑被載入） */
export const CATALOG = [
  { id: 'g5-u1', grade: 5, no: 1, title: '太陽的祕密', ready: true,
    original: { page: 'island.html', quiz: 'index.html?u=20', exams: ['pdf/kt-g5-nat-u1-exam.pdf', 'pdf/kt-g5-nat-u1-ans.pdf'] } },
  { id: 'g5-u2', grade: 5, no: 2, title: '千變萬化的植物', ready: false,
    original: { page: 'island.html', quiz: 'index.html?u=21', exams: ['pdf/kt-g5-nat-u2-exam.pdf', 'pdf/kt-g5-nat-u2-ans.pdf'] } },
  { id: 'g6-u1', grade: 6, no: 1, title: '熱的影響與傳播', ready: true,
    original: { page: 'island-g6-nat.html', quiz: 'index.html?u=1', exams: ['pdf/kt-g6-nat-u1-exam.pdf', 'pdf/kt-g6-nat-u1-ans.pdf'] } },
  { id: 'g6-u2', grade: 6, no: 2, title: '多變的天氣', ready: false,
    original: { page: 'island-g6-nat.html', quiz: 'index.html?u=2', exams: ['pdf/kt-g6-nat-u2-exam.pdf', 'pdf/kt-g6-nat-u2-ans.pdf'] } },
];

export const LOADERS = { 'g5-u1': () => import('./g5-u1.js'), 'g6-u1': () => import('./g6-u1.js') };
