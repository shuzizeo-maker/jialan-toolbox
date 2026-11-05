// 臺北時區時間工具（不受使用者電腦時區影響）
const WEEK = '日一二三四五六';
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short', hourCycle: 'h23',
});
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function taipeiParts(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
  return {
    y: +p.year, m: +p.month, d: +p.day,
    hh: +p.hour % 24, mm: +p.minute, ss: +p.second,
    weekday: WEEK[WD[p.weekday]],
  };
}

const pad = n => String(n).padStart(2, '0');

export function todayKey(date = new Date()) {
  const { y, m, d } = taipeiParts(date);
  return `${y}${pad(m)}${pad(d)}`;
}

export function formatRoc(date) {
  const { y, m, d, hh, mm, weekday } = taipeiParts(date);
  return `${y - 1911}年${m}月${d}日（${weekday}）${pad(hh)}:${pad(mm)}`;
}

/** 'yyyymmdd' → 'yyyy.mm.dd' */
export function dotDate(key) {
  return `${key.slice(0, 4)}.${key.slice(4, 6)}.${key.slice(6, 8)}`;
}

export function startClock(el, now = () => new Date()) {
  const tick = () => { el.textContent = formatRoc(now()); };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}
