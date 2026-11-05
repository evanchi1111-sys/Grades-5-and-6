/* 太陽位置的簡化模型（教學模擬用）
 * 假設：地點緯度 25°N（臺灣北部附近）、四個節氣的太陽赤緯固定（春秋分 0°、夏至 +23.44°、冬至 −23.44°）、
 *       地面平坦無遮蔽、太陽光視為平行光、忽略大氣折射與日期的細微差異。
 * 限制：這是用天文幾何算出的「估計值」，不是某天某地的實測資料；課本只要求比較大小與方位關係。 */
export const LAT = 25;
export const DECL = { spring: 0, summer: 23.44, autumn: 0, winter: -23.44 };
export const TERMS = [
  { id: 'spring', name: '春分', color: '#6cc56a' },
  { id: 'summer', name: '夏至', color: '#ff8a5c' },
  { id: 'autumn', name: '秋分', color: '#f2b93b' },
  { id: 'winter', name: '冬至', color: '#5c9dff' },
];
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;

/* hour：0～24 的時刻（太陽時）。回傳 { alt: 高度角°, az: 方位角°（北＝0，順時針） } */
export function sunPos(decl, hour, lat = LAT) {
  const H = rad((hour - 12) * 15), d = rad(decl), p = rad(lat);
  const sinAlt = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(d) - sinAlt * Math.sin(p)) / (Math.cos(alt) * Math.cos(p) || 1e-9);
  let az = deg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (hour > 12) az = 360 - az;
  return { alt: deg(alt), az };
}

/* 日出、日落時刻與方位 */
export function dayInfo(decl, lat = LAT) {
  const x = -Math.tan(rad(lat)) * Math.tan(rad(decl)), H0 = deg(Math.acos(Math.max(-1, Math.min(1, x))));
  const rise = 12 - H0 / 15, set = 12 + H0 / 15;
  return { rise, set, riseAz: sunPos(decl, rise + 0.0001, lat).az, setAz: sunPos(decl, set - 0.0001, lat).az, noonAlt: sunPos(decl, 12, lat).alt };
}

export const fmtTime = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return (mm === 60 ? hh + 1 : hh) + ':' + String(mm === 60 ? 0 : mm).padStart(2, '0'); };

/* 方位名稱：貼近課本用法（正東、東偏南、東南…） */
export function azName(az) {
  az = ((az % 360) + 360) % 360;
  const card = [['北', 0], ['東', 90], ['南', 180], ['西', 270]];
  const near = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  for (const [n, a] of card) if (near(az, a) <= 11.25) return '正' + n;
  const inter = [['東北', 45, '北', '東'], ['東南', 135, '東', '南'], ['西南', 225, '南', '西'], ['西北', 315, '西', '北']];
  for (const [n, a] of inter) if (near(az, a) <= 11.25) return n;
  // 介於正方位與斜方位之間：用「甲偏乙」，甲＝較近的正方位
  let best = card[0], bd = 999;
  for (const c of card) { const d = near(az, c[1]); if (d < bd) { bd = d; best = c; } }
  const diff = ((az - best[1] + 540) % 360) - 180; // >0：順時針偏
  const order = ['北', '東', '南', '西'], i = order.indexOf(best[0]);
  const toward = diff > 0 ? order[(i + 1) % 4] : order[(i + 3) % 4];
  return best[0] + '偏' + toward;
}

export const oppositeAz = (az) => (az + 180) % 360;
export const shadowRatio = (alt) => 1 / Math.tan(rad(Math.max(alt, 0.5))); // 影長是竿高的幾倍（幾何關係）
export { rad, deg };
