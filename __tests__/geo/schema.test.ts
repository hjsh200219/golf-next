import { describe, it, expect } from 'vitest';
import { getWebSiteSchema, getWebApplicationSchema, getFAQPageSchema, getAllSchemas } from '@/lib/schema';

describe('JSON-LD Schema - WebSite', () => {
  it('returns valid WebSite schema', () => {
    const schema = getWebSiteSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
    expect(schema.name).toContain('GolfShin');
    expect(schema.inLanguage).toBe('ko');
  });

  it('includes search action', () => {
    const schema = getWebSiteSchema();
    expect(schema.potentialAction).toBeDefined();
    expect(schema.potentialAction['@type']).toBe('SearchAction');
  });
});

describe('JSON-LD Schema - WebApplication', () => {
  it('returns valid WebApplication schema', () => {
    const schema = getWebApplicationSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebApplication');
    expect(schema.applicationCategory).toBe('SportsApplication');
    expect(schema.operatingSystem).toBe('Web');
  });

  it('includes offers with free pricing', () => {
    const schema = getWebApplicationSchema();
    expect(schema.offers).toBeDefined();
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.offers.price).toBe('0');
  });
});

describe('JSON-LD Schema - FAQPage', () => {
  it('returns valid FAQPage schema', () => {
    const schema = getFAQPageSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
  });

  it('has at least 3 FAQ entries', () => {
    const schema = getFAQPageSchema();
    expect(schema.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  it('each FAQ entry has Question type with acceptedAnswer', () => {
    const schema = getFAQPageSchema();
    for (const entry of schema.mainEntity) {
      expect(entry['@type']).toBe('Question');
      expect(entry.name).toBeTruthy();
      expect(entry.acceptedAnswer['@type']).toBe('Answer');
      expect(entry.acceptedAnswer.text).toBeTruthy();
    }
  });
});

describe('getAllSchemas', () => {
  it('returns array of all schemas', () => {
    const schemas = getAllSchemas();
    expect(Array.isArray(schemas)).toBe(true);
    expect(schemas.length).toBe(3);
  });

  it('contains WebSite, WebApplication, and FAQPage types', () => {
    const schemas = getAllSchemas();
    const types = schemas.map((s: { '@type': string }) => s['@type']);
    expect(types).toContain('WebSite');
    expect(types).toContain('WebApplication');
    expect(types).toContain('FAQPage');
  });
});
