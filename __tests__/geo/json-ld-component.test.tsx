import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import JsonLdSchema from '@/components/JsonLdSchema';

describe('JsonLdSchema component', () => {
  it('renders script tags with application/ld+json type', () => {
    const { container } = render(<JsonLdSchema />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(3);
  });

  it('each script contains valid JSON', () => {
    const { container } = render(<JsonLdSchema />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach((script) => {
      expect(() => JSON.parse(script.textContent || '')).not.toThrow();
    });
  });

  it('contains WebSite schema', () => {
    const { container } = render(<JsonLdSchema />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const contents = Array.from(scripts).map((s) => JSON.parse(s.textContent || ''));
    const webSite = contents.find((c) => c['@type'] === 'WebSite');
    expect(webSite).toBeDefined();
  });

  it('contains FAQPage schema', () => {
    const { container } = render(<JsonLdSchema />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const contents = Array.from(scripts).map((s) => JSON.parse(s.textContent || ''));
    const faqPage = contents.find((c) => c['@type'] === 'FAQPage');
    expect(faqPage).toBeDefined();
  });
});
