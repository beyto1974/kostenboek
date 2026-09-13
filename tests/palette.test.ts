import { describe, expect, it } from 'vitest';
import { colorForIndex, PROJECT_COLORS } from '../src/domain/palette';
import { rateShade } from '../src/ui/palette';

describe('the project palette', () => {
  it('holds ten colours, each a custom property of the stylesheet', () => {
    expect(PROJECT_COLORS).toHaveLength(10);
    expect(PROJECT_COLORS[0]).toBe('var(--project-1)');
    expect(PROJECT_COLORS[9]).toBe('var(--project-10)');
  });

  it('gives each new project the next colour, and starts again after ten', () => {
    expect(colorForIndex(0)).toBe('var(--project-1)');
    expect(colorForIndex(9)).toBe('var(--project-10)');
    expect(colorForIndex(10)).toBe('var(--project-1)');
    expect(colorForIndex(23)).toBe('var(--project-4)');
  });
});

describe('the shade that marks the second rate', () => {
  it('leaves the standard rate the project colour itself', () => {
    expect(rateShade('var(--project-3)', 'standard')).toBe('var(--project-3)');
  });

  it('pulls the second rate towards the ink, which is darker or lighter by theme', () => {
    expect(rateShade('var(--project-3)', 'premium')).toBe(
      'color-mix(in oklab, var(--project-3) 62%, var(--ink))'
    );
  });
});
