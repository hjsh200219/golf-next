/**
 * /privacy and /support — static server components required for the iOS App Store listing.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PrivacyPage, { metadata as privacyMeta } from '@/app/privacy/page';
import SupportPage, { metadata as supportMeta } from '@/app/support/page';
import Footer from '@/components/layout/Footer';

const EMAIL = 'ho.shin@shconsulting.ai';

describe('PrivacyPage', () => {
  it('has a heading, effective date and contact email', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('개인정보처리방침');
    expect(screen.getByText(/시행일.*2026-11-21/)).toBeInTheDocument();
    const mail = screen.getAllByRole('link', { name: EMAIL })[0];
    expect(mail).toHaveAttribute('href', `mailto:${EMAIL}`);
  });

  it('lists what the web service stores and who receives data', () => {
    render(<PrivacyPage />);
    for (const t of ['user_favorites', 'device_favorites', 'Supabase', 'Vercel', 'Google Maps', 'OpenWeatherMap', 'Telegram', 'Google Analytics']) {
      expect(screen.getAllByText(new RegExp(t)).length).toBeGreaterThan(0);
    }
  });

  it('has a separate iOS app section: no login, no collection, no tracking, Apple Maps', () => {
    render(<PrivacyPage />);
    const h = screen.getByRole('heading', { name: /골프신\(GolfShin\) iOS 앱/ });
    expect(h).toBeInTheDocument();
    const section = h.closest('section') as HTMLElement;
    expect(section).toHaveTextContent('계정');
    expect(section).toHaveTextContent('수집하지 않');
    expect(section).toHaveTextContent('추적하지 않');
    expect(section).toHaveTextContent('Apple 지도');
    expect(section).toHaveTextContent('golfshin.vercel.app');
  });

  it('exports metadata', () => {
    expect(String(privacyMeta.title)).toContain('개인정보처리방침');
  });
});

describe('SupportPage', () => {
  it('describes the service, gives the email and links to the privacy page', () => {
    render(<SupportPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('지원');
    expect(screen.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
    expect(screen.getByRole('link', { name: /개인정보처리방침/ })).toHaveAttribute('href', '/privacy');
    expect(String(supportMeta.title)).toContain('지원');
  });
});

describe('Footer', () => {
  it('links to privacy and support', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: '지원' })).toHaveAttribute('href', '/support');
  });
});
