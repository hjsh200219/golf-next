import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('llms.txt', () => {
  const filePath = path.resolve(__dirname, '../../public/llms.txt');

  it('exists in public directory', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('starts with site name heading', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/^# .*GolfShin/m);
  });

  it('contains About section', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('## About');
  });

  it('contains key service description keywords', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/골프장/);
    expect(content).toMatch(/티타임/);
    expect(content).toMatch(/예약/);
  });

  it('contains region coverage info', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/경기/);
    expect(content).toMatch(/강원/);
    expect(content).toMatch(/충청/);
    expect(content).toMatch(/인천/);
  });

  it('contains Website section with URL', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('## Website');
  });

  it('contains AI/LLM attribution notice', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/LLM|AI|llms\.txt/i);
  });
});
