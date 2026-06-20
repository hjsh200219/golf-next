/**
 * ChatbotPage tests
 *
 * Verifies the Telegram bot guide page renders with required content.
 * Server component — no hooks, no navigation mock needed.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ChatbotPage from '@/app/chatbot/page';

describe('ChatbotPage', () => {
  it('renders the page heading', () => {
    render(<ChatbotPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('텔레그램 빈자리 알림봇');
  });

  it('renders the Telegram bot CTA link with correct href', () => {
    render(<ChatbotPage />);
    const link = screen.getByRole('link', { name: /봇 열기/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://t.me/golfshinbot');
  });

  it('renders the /watch command', () => {
    render(<ChatbotPage />);
    expect(screen.getByText('/watch')).toBeInTheDocument();
  });

  it('renders the /list command', () => {
    render(<ChatbotPage />);
    expect(screen.getByText('/list')).toBeInTheDocument();
  });

  it('renders the /stop command', () => {
    render(<ChatbotPage />);
    expect(screen.getByText('/stop')).toBeInTheDocument();
  });

  it('renders step-by-step usage instructions', () => {
    render(<ChatbotPage />);
    expect(screen.getByText(/이렇게 사용하세요/)).toBeInTheDocument();
  });

  it('the CTA link opens in a new tab', () => {
    render(<ChatbotPage />);
    const link = screen.getByRole('link', { name: /봇 열기/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
