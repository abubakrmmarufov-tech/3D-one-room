import { Color, MathUtils } from 'three';

// A visual day cycle, not a geographic solar ephemeris. One clock drives every view.
const frames = [
  [0, 0x0b152b, 0x26334b, 0xa9c4f0, .16, .25, .15, 0],
  [5, 0x253250, 0x887a89, 0xb8cae8, .16, .23, .12, .05],
  [6.5, 0x718ba7, 0xf3c09e, 0xffb27a, 1.1, .38, .28, .42],
  [8, 0x86aac5, 0xf0e1ce, 0xffdfb0, 1.9, .55, .48, .9],
  [12, 0x81a9c9, 0xe6e8e2, 0xfff2df, 2.2, .62, .55, 1],
  [16.5, 0x8caac1, 0xf1debd, 0xffd49b, 1.9, .52, .46, .9],
  [18.5, 0x647796, 0xf0a57e, 0xffa367, 1.05, .32, .25, .34],
  [20, 0x1b2c4c, 0x59647c, 0xb6cdf2, .15, .22, .12, .04],
  [22, 0x0b152b, 0x26334b, 0xa9c4f0, .16, .25, .15, 0],
  [24, 0x0b152b, 0x26334b, 0xa9c4f0, .16, .25, .15, 0],
];
export const wrapHour = hour => ((hour % 24) + 24) % 24;
export const hourDelta = (from, to) => ((to - from + 36) % 24) - 12;
export function formatHour(hour) {
  const minutes = Math.round(wrapHour(hour) * 60) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function lightingAt(hour) {
  hour = wrapHour(hour);
  const i = frames.findIndex((f, n) => n < frames.length - 1 && hour >= f[0] && hour < frames[n + 1][0]);
  const a = frames[Math.max(0, i)], b = frames[Math.max(0, i) + 1];
  const t = MathUtils.smoothstep(hour, a[0], b[0]);
  const color = n => new Color(a[n]).lerp(new Color(b[n]), t);
  const value = n => MathUtils.lerp(a[n], b[n], t);
  const daylight = value(7);
  return { hour, top: color(1), horizon: color(2), sunColor: color(3),
    sun: value(4), ambient: value(5), environment: value(6), daylight,
    night: 1 - MathUtils.smoothstep(daylight, .08, .65),
    exposure: MathUtils.lerp(.95, 1.03, daylight),
  };
}
