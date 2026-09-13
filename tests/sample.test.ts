import { describe, expect, it } from 'vitest';
import { sampleBook } from '../src/data/sample';
import { addDays, isWeekend, monthOf } from '../src/domain/dates';
import { parseSlot } from '../src/domain/slots';
import { monthTotals } from '../src/domain/rollups';
import { decodeBook, encodeBook } from '../src/persistence/codec';

const TODAY = '2026-09-13';

describe('the book a first-time visitor is shown', () => {
  it('has four projects, each with a day rate and a higher evening rate', () => {
    const projects = sampleBook(TODAY).projects;

    expect(projects).toHaveLength(4);
    for (const project of projects) {
      expect(project.code).toMatch(/^[A-Z]{3}$/);
      expect(project.client).not.toBe('');
      expect(project.eveningRate).toBeGreaterThan(project.rate);
    }
  });

  it('is marked as the example, so the app can say so', () => {
    expect(sampleBook(TODAY).example).toBe(true);
  });

  it('books a few weeks of work, all of it in the past and none of it at the weekend', () => {
    const book = sampleBook(TODAY);
    const dates = Object.keys(book.slots).map((key) => parseSlot(key).date);

    expect(dates.length).toBeGreaterThan(30);
    for (const date of dates) {
      expect(date <= TODAY).toBe(true);
      expect(date >= addDays(TODAY, -30)).toBe(true);
      expect(isWeekend(date)).toBe(false);
    }
  });

  it('tells a story: some work paid, some waiting on an invoice, some not sent yet', () => {
    const book = sampleBook(TODAY);
    const statuses = Object.values(book.days).map((day) => day.status);

    expect(statuses).toContain('paid');
    expect(statuses).toContain('invoiced');
    expect(statuses).toContain('unbilled');

    for (const day of Object.values(book.days)) {
      if (day.status === 'unbilled') expect(day.invoiceRef).toBeUndefined();
      else expect(day.sentOn).toBeTruthy();
    }
  });

  it('gives every booked hour a project the book has', () => {
    const book = sampleBook(TODAY);
    const known = new Set(book.projects.map((project) => project.id));

    for (const slot of Object.values(book.slots)) expect(known.has(slot.projectId)).toBe(true);
  });

  it('has some money outstanding, which is the point of the example', () => {
    const totals = monthTotals(sampleBook(TODAY), monthOf(TODAY));
    expect(totals.outstanding).toBeGreaterThan(0);
    expect(totals.hours).toBeGreaterThan(0);
  });

  it('moves with the clock, and is always a book the app can read', () => {
    const later = sampleBook('2027-03-02');
    const dates = Object.keys(later.slots).map((key) => parseSlot(key).date);

    expect(dates.every((date) => date <= '2027-03-02')).toBe(true);
    expect(decodeBook(encodeBook(later))).toEqual(later);
  });
});
