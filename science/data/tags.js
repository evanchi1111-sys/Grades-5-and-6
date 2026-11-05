/* 知識標籤（草稿，狀態：待審核）
 * 每個標籤對應「補救入口」：答錯時，系統會推薦回到對應的互動實驗或教材節點，而不是只再出題。
 * 標籤名稱與分類由本系統新增，原題庫只有 u／t 兩層；審核通過後才可改為「已審核」。 */
export const TAGS = {
  'sun-path-day':       { name: '太陽一天的方位與高度變化', unit: 'g5-u1', remedy: { step: 'lab', act: 'sun-shadow' }, status: '待審核' },
  'shadow-opposite':    { name: '影子與太陽方位相反',       unit: 'g5-u1', remedy: { step: 'lab', act: 'sun-shadow' }, status: '待審核' },
  'shadow-length':      { name: '太陽高度與影子長度',       unit: 'g5-u1', remedy: { step: 'lab', act: 'sun-shadow' }, status: '待審核' },
  'noon-shadow':        { name: '正午的影子（最短、朝北）', unit: 'g5-u1', remedy: { step: 'lab', act: 'sun-shadow' }, status: '待審核' },
  'observe-sun':        { name: '怎麼觀測太陽（方位、安全）', unit: 'g5-u1', remedy: { step: 'lesson', node: 'a2' }, status: '待審核' },
  'sundial':            { name: '日晷',                     unit: 'g5-u1', remedy: { step: 'lesson', node: 'a2' }, status: '待審核' },
  'sunrise-set-season': { name: '四季的日出日落方位',       unit: 'g5-u1', remedy: { step: 'lab', act: 'seasons' }, status: '待審核' },
  'noon-altitude-season': { name: '四季正午的太陽高度角',   unit: 'g5-u1', remedy: { step: 'lab', act: 'seasons' }, status: '待審核' },
  'season-temp':        { name: '太陽高度角與氣溫（易錯）', unit: 'g5-u1', remedy: { step: 'lab', act: 'seasons' }, status: '待審核' },
  'earth-rotation':     { name: '太陽東升西落的原因',       unit: 'g5-u1', remedy: { step: 'lesson', node: 'a3' }, status: '待審核' },
  'solar-use':          { name: '太陽能的利用（光電板、集熱器）', unit: 'g5-u1', remedy: { step: 'lesson', node: 'a1' }, status: '待審核' },
  'solar-panel':        { name: '太陽能板的朝向與遮蔽',     unit: 'g5-u1', remedy: { step: 'lab', act: 'solar-panel' }, status: '待審核' },
  'rainbow':            { name: '彩虹與陽光的顏色',         unit: 'g5-u1', remedy: { step: 'lesson', node: 'a4' }, status: '待審核' },
  'refraction':         { name: '光的折射',                 unit: 'g5-u1', remedy: { step: 'lesson', node: 'a4' }, status: '待審核' },
  'magnifier':          { name: '放大鏡',                   unit: 'g5-u1', remedy: { step: 'lesson', node: 'a4' }, status: '待審核' },
};
