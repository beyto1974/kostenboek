import { describe, expect, it } from 'vitest';
import { cleanText, requireText } from '../src/domain/text';

describe('cleanText', () => {
  it('trims the ends', () => {
    expect(cleanText('  Northside School site  ')).toBe('Northside School site');
  });

  it('collapses runs of whitespace inside the text', () => {
    expect(cleanText('Northside   School\tsite')).toBe('Northside School site');
    expect(cleanText('two\nlines')).toBe('two lines');
  });

  it('leaves an empty string empty', () => {
    expect(cleanText('   ')).toBe('');
    expect(cleanText('')).toBe('');
  });

  it('takes anything that is not a string as nothing', () => {
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(null)).toBe('');
    expect(cleanText(42 as unknown as string)).toBe('');
  });
});

describe('requireText', () => {
  it('hands back the cleaned text', () => {
    expect(requireText('  Harbour Bakery ', 'client')).toBe('Harbour Bakery');
  });

  it('says which field is missing', () => {
    expect(() => requireText('   ', 'project name')).toThrow(/project name/);
  });

  it('refuses text longer than the limit', () => {
    expect(() => requireText('x'.repeat(201), 'note', 200)).toThrow(/note/);
    expect(requireText('x'.repeat(200), 'note', 200)).toHaveLength(200);
  });
});
