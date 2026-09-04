import { describe, expect, it } from 'vitest';
import { project, rolling, tileState } from '@/utils/calculations';
import { formatDate, formatValue, parseNumber } from '@/utils/formatting';
import { smoothPath } from '@/utils/graphUtils';
import { localDraft } from '@/lib/ai';

describe('calculations', () => {
  it('rolling averages dense series', () => {
    const pts = Array.from({ length: 14 }, (_, i) => ({ d: i, v: 140 - i }));
    const r = rolling(pts, 7);
    expect(r.length).toBeGreaterThan(0);
    expect(r[r.length - 1].v).toBeLessThan(140);
  });

  it('project needs enough points', () => {
    expect(project([{ d: 1, v: 1 }], 5)).toBeNull();
    const pts = Array.from({ length: 10 }, (_, i) => ({ d: i, v: 150 - i }));
    const p = project(pts, 8);
    expect(p).not.toBeNull();
    expect(p!.slope).toBeLessThan(0);
  });

  it('tileState marks target ok', () => {
    expect(tileState(135, 130, 150, false).status).toBe('ok');
    expect(tileState(135, 140, 150, false).status).toBe('mid');
  });
});

describe('formatting', () => {
  it('formats Finnish decimals', () => {
    expect(formatValue(6.2, true)).toBe('6,2');
    expect(formatValue(132, false)).toBe('132');
    expect(parseNumber('6,2')).toBe(6.2);
  });

  it('formats dates', () => {
    expect(formatDate(new Date(2026, 8, 4))).toBe('4.9.2026');
  });
});

describe('graphUtils', () => {
  it('smoothPath for two points', () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 }
    ]);
    expect(d.startsWith('M')).toBe(true);
    expect(d.includes('L')).toBe(true);
  });
});

describe('localDraft', () => {
  it('builds a Finnish draft', () => {
    const text = localDraft(
      'yhteenveto',
      {
        id: 'usr_potilas_demo',
        name: 'Matti Korhonen',
        startLabel: '1.6.2026',
        bp: [
          { d: 0, v: 150 },
          { d: 10, v: 138 }
        ],
        glucose: [{ d: 0, v: 6.5 }],
        weight: [
          { d: 0, v: 92 },
          { d: 10, v: 89 }
        ],
        meds: [{ name: 'Ramipril', dose: '5 mg' }],
        symptoms: ['huimaus'],
        labs: [],
        bpTarget: 135
      },
      'Kontrolli 6 vk'
    );
    expect(text).toContain('Käynnin yhteenveto');
    expect(text).toContain('Matti Korhonen');
    expect(text).toContain('Kontrolli 6 vk');
  });
});
