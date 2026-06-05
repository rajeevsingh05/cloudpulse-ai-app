import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import App from '../App';

// ----------------------------------------------------------------
// Mock axios so no real HTTP calls are made during tests
// ----------------------------------------------------------------
vi.mock('axios');

describe('App - Static Rendering', () => {
  it('renders the CloudPulse AI heading', () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'UP', service: 'backend' } });
    render(<App />);
    expect(screen.getByText('CloudPulse AI')).toBeInTheDocument();
  });

  it('renders the platform subtitle', () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    render(<App />);
    expect(
      screen.getByText('AI-Powered DevOps Incident Intelligence Platform')
    ).toBeInTheDocument();
  });

  it('renders the Environment Health card', () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    render(<App />);
    expect(screen.getByText('Environment Health')).toBeInTheDocument();
  });

  it('renders the Incident Detection card', () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    render(<App />);
    expect(screen.getByText('Incident Detection')).toBeInTheDocument();
  });

  it('renders the AI Recommendation card', () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    render(<App />);
    expect(screen.getByText('AI Recommendation')).toBeInTheDocument();
  });

  it('shows "No analysis yet." before analyze button is clicked', () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    render(<App />);
    expect(screen.getByText('No analysis yet.')).toBeInTheDocument();
  });

  it('renders the Analyze with AI button', () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    render(<App />);
    expect(screen.getByRole('button', { name: /analyze with ai/i })).toBeInTheDocument();
  });

  it('shows "Loading..." for health status initially', () => {
    // Never resolves during this test — stays in loading state
    axios.get.mockReturnValueOnce(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText(/Loading\.\.\./)).toBeInTheDocument();
  });
});

describe('App - Health API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays health status returned from the backend', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'UP', service: 'backend' } });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Status: UP/)).toBeInTheDocument();
    });
  });

  it('displays service name returned from the backend', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'UP', service: 'backend' } });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Service: backend/)).toBeInTheDocument();
    });
  });

  it('shows fallback message when backend is not reachable', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Backend not reachable/)).toBeInTheDocument();
    });
  });

  it('calls /api/health endpoint on mount', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'UP' } });
    render(<App />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/health')
      );
    });
  });

  it('calls /api/health exactly once on mount', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'UP' } });
    render(<App />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
});

describe('App - Analyze Incident', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays AI recommendation after clicking Analyze', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'UP' } });
    axios.post.mockResolvedValueOnce({
      data: {
        severity: 'HIGH',
        rootCause: 'Memory leak in container',
        recommendation: 'Increase memory limits and add liveness probe',
      },
    });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/Increase memory limits and add liveness probe/)).toBeInTheDocument();
    });
  });

  it('displays severity from AI response', async () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    axios.post.mockResolvedValueOnce({
      data: { severity: 'CRITICAL', rootCause: 'OOMKilled', recommendation: 'Scale up node pool' },
    });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/CRITICAL/)).toBeInTheDocument();
    });
  });

  it('displays root cause from AI response', async () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    axios.post.mockResolvedValueOnce({
      data: { severity: 'HIGH', rootCause: 'OOMKilled', recommendation: 'Scale up node pool' },
    });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/OOMKilled/)).toBeInTheDocument();
    });
  });

  it('posts to /api/analyze endpoint when button is clicked', async () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    axios.post.mockResolvedValueOnce({
      data: { severity: 'LOW', rootCause: 'N/A', recommendation: 'Monitor' },
    });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/analyze'),
        expect.objectContaining({
          environment: 'dev',
          issue: expect.any(String),
        })
      );
    });
  });

  it('hides "No analysis yet." after receiving AI response', async () => {
    axios.get.mockResolvedValueOnce({ data: {} });
    axios.post.mockResolvedValueOnce({
      data: { severity: 'HIGH', rootCause: 'Crash', recommendation: 'Fix it' },
    });

    render(<App />);
    expect(screen.getByText('No analysis yet.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.queryByText('No analysis yet.')).not.toBeInTheDocument();
    });
  });
});
