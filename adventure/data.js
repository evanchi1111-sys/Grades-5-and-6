/* 學習冒險島：集中管理資料與連結
 * 所有網址皆來自原站 home.html 的 DATA、各學習島的 EXAM 對照表，以及 index.html 的 UNITS。
 * 不要在其他檔案散寫連結。要新增六年級教材：把該科的 teach 改成學習島網址即可（見 README-adventure.md）。
 */

export const SITE = {
  legacyHome: 'home-classic.html',
  overview: 'overview.html',
  quizHome: 'index.html',
};

const pdf = (name) => `pdf/${name}.pdf`;
const quiz = (u) => `index.html?u=${u}`;

/* o.u：直接刷題單元（同 home.html 的 game）；o.midU：期中總複習單元；o.kaoguU：考古題單元
 * o.mid：期中總複習 PDF 前綴（home.html 的 mid）；o.kaogu：考古題 PDF 前綴 */
function subject(o) {
  const quizzes = [{ label: '直接刷題', url: quiz(o.u) }];
  if (o.midU) quizzes.push({ label: '期中總複習刷題', url: quiz(o.midU) });
  if (o.kaoguU) quizzes.push({ label: '考古題刷題', url: quiz(o.kaoguU) });
  const exams = [
    { label: '期中總複習 試卷（PDF）', url: pdf(o.mid + '-exam') },
    { label: '期中總複習 答案（PDF）', url: pdf(o.mid + '-ans') },
  ];
  if (o.kaogu) {
    exams.push({ label: '考古題 試卷（PDF）', url: pdf(o.kaogu + '-exam') });
    exams.push({ label: '考古題 答案（PDF）', url: pdf(o.kaogu + '-ans') });
  }
  exams.push({ label: '期末總複習', url: null }); // 原站尚未提供
  return { ...o, teachReady: !!o.teach, quizzes, exams };
}

/* building：建築造型；color：主色 */
export const GRADES = [
  {
    id: 'g5', name: '五年級', islandName: '五年級學習島', sub: '上學期', x: -13,
    subjects: [
      subject({ id: 'chi', name: '國語', building: 'library', buildingName: '知識圖書館', color: '#ff8a80',
        desc: '第 1～6 課：課文、字詞、修辭、句型',
        teach: 'island-g5-chi.html', u: 14, midU: 30, kaoguU: 40, mid: 'kt-g5-chi-mid', kaogu: 'kaogu-g5-chi' }),
      subject({ id: 'mat', name: '數學', building: 'institute', buildingName: '數學研究所', color: '#8c8cf0',
        desc: '單元 1～5：折線圖、因數倍數、多邊形、分數、線對稱',
        teach: 'island-g5-mat.html', u: 25, midU: 32, kaoguU: 41, mid: 'kt-g5-math-mid', kaogu: 'kaogu-g5-math' }),
      subject({ id: 'soc', name: '社會', building: 'museum', buildingName: '歷史博物館', color: '#f2b93b',
        desc: '單元一、二：臺灣的位置、規範與法律、地形與氣候',
        teach: 'island-g5-soc.html', u: 23, midU: 31, kaoguU: 42, mid: 'kt-g5-soc-mid', kaogu: 'kaogu-g5-soc' }),
      subject({ id: 'nat', name: '自然', building: 'lab', buildingName: '科學實驗室', color: '#6cc56a',
        desc: '單元一、二：太陽的祕密、千變萬化的植物',
        teach: 'island.html', u: 20, midU: 22, kaoguU: 43, mid: 'kt-g5-nat-mid', kaogu: 'kaogu-g5-sci',
        lab: { unit: 'g5-u1', label: '太陽的祕密（互動教材）', url: 'science/unit.html?id=g5-u1', more: 'science/index.html' } }),
    ],
  },
  {
    id: 'g6', name: '六年級', islandName: '六年級學習島', sub: '上學期', x: 13,
    subjects: [
      subject({ id: 'chi', name: '國語', building: 'library', buildingName: '知識圖書館',  color: '#ff8a80',
        desc: '第 1～6 課', teach: null, u: 5, midU: 33, kaoguU: 36, mid: 'kt-g6-chi-mid', kaogu: 'kaogu-g6-chi' }),
      subject({ id: 'mat', name: '數學', building: 'institute', buildingName: '數學研究所', color: '#8c8cf0',
        desc: '單元一～四：公因數公倍數、分數與小數除法、比與比值',
        teach: null, u: 8, midU: 12, kaoguU: 37, mid: 'kt-g6-math-mid', kaogu: 'kaogu-g6-math' }),
      subject({ id: 'soc', name: '社會', building: 'museum', buildingName: '歷史博物館', color: '#f2b93b',
        desc: '單元一、二：消費與理財、戰後經濟與建設',
        teach: 'island-g6-soc.html', u: 3, midU: 34, kaoguU: 38, mid: 'kt-g6-soc-mid', kaogu: 'kaogu-g6-soc' }),
      subject({ id: 'nat', name: '自然', building: 'lab', buildingName: '科學實驗室', color: '#6cc56a',
        desc: '單元一、二：熱的影響與傳播、多變的天氣',
        teach: 'island-g6-nat.html', u: 1, midU: 35, kaoguU: 39, mid: 'kt-g6-nat-mid', kaogu: 'kaogu-g6-sci',
        lab: { unit: 'g6-u1', label: '熱的影響與傳播（互動教材）', url: 'science/unit.html?id=g6-u1', more: 'science/index.html' } }),
    ],
  },
];

export function findSubject(gradeId, subjectId) {
  const g = GRADES.find((x) => x.id === gradeId);
  return g ? { grade: g, subject: g.subjects.find((s) => s.id === subjectId) } : null;
}
