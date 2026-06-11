import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import App from '../App';

// ----------------------------------------------------------------
// Mock axios so no real HTTP calls are made during tests.
//
// On mount the app fetches three endpoints (health, deployments,
// incidents), so we route the mock by URL.
// ----------------------------------------------------------------
vi.mock('axios');

const HEALTH = { status: 'UP', service: 'backend', platform: 'CloudPulse AI' };

const DEPLOYMENTS = {
  dev: 'Running',
  prod: 'Running',
  gitops: 'Managed by ArgoCD',
  cluster: 'AKS',
  environments: [
    { name: 'dev', health: 'Healthy', syncStatus: 'Synced', argoApp: 'cloudpulse-dev' },
    { name: 'prod', health: 'Healthy', syncStatus: 'Synced', argoApp: 'cloudpulse-prod' },
  ],
};

const INCIDENTS = [
  { id: 'INC-1001', environment: 'dev', service: 'backend', type: 'CrashLoopBackOff', title: 'CrashLoopBackOff detected', restartCount: 5, status: 'OPEN' },
  { id: 'INC-2001', environment: 'prod', service: 'backend', type: 'OOMKilled', title: 'Backend pod OOMKilled', restartCount: 3, status: 'OPEN' },
];

function mockGet({ health = HEALTH, deployments = DEPLOYMENTS, incidents = INCIDENTS } = {}) {
  axios.get.mockImplementation((url) => {
    if (url.includes('/api/health')) return Promise.resolve({ data: health });
    if (url.includes('/api/deployments')) return Promise.resolve({ data: deployments });
    if (url.includes('/api/incidents')) return Promise.resolve({ data: incidents });
    return Promise.resolve({ data: {} });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet();
});

describe('App - Static Rendering', () => {
  it('renders the CloudPulse AI heading', () => {
    render(<App />);
    expect(screen.getByText('CloudPulse AI')).toBeInTheDocument();
  });

  it('renders the platform subtitle', () => {
    render(<App />);
    expect(
      screen.getByText('AI-Powered DevOps Incident Intelligence Platform')
    ).toBeInTheDocument();
  });

  it('renders the Environment Health card', () => {
    render(<App />);
    expect(screen.getByText('Environment Health')).toBeInTheDocument();
  });

  it('renders the Incident Detection card', () => {
    render(<App />);
    expect(screen.getByText('Incident Detection')).toBeInTheDocument();
  });

  it('renders the AI Recommendation card', () => {
    render(<App />);
    expect(screen.getByText('AI Recommendation')).toBeInTheDocument();
  });

  it('shows "No analysis yet." before analyze button is clicked', () => {
    render(<App />);
    expect(screen.getByText('No analysis yet.')).toBeInTheDocument();
  });

  it('renders the Analyze with AI button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /analyze with ai/i })).toBeInTheDocument();
  });

  it('shows "Loading..." for health status before the backend responds', () => {
    // health never resolves -> stays in loading state
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/health')) return new Promise(() => {});
      return Promise.resolve({ data: {} });
    });
    render(<App />);
    expect(screen.getAllByText(/Loading\.\.\./).length).toBeGreaterThan(0);
  });
});

describe('App - Mount API Integration', () => {
  it('displays health status returned from the backend', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Status: UP/)).toBeInTheDocument();
    });
  });

  it('displays service name returned from the backend', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Service: backend/)).toBeInTheDocument();
    });
  });

  it('shows fallback message when backend health is not reachable', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/health')) return Promise.reject(new Error('Network Error'));
      if (url.includes('/api/deployments')) return Promise.resolve({ data: DEPLOYMENTS });
      if (url.includes('/api/incidents')) return Promise.resolve({ data: INCIDENTS });
      return Promise.resolve({ data: {} });
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Backend not reachable/)).toBeInTheDocument();
    });
  });

  it('calls the health, deployments and incidents endpoints on mount', async () => {
    render(<App />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/health'));
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/deployments'));
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/incidents'));
    });
  });

  it('renders GitOps environment status from /api/deployments', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText(/Sync Status: Synced/).length).toBeGreaterThan(0);
    });
  });
});

describe('App - Analyze Incident', () => {
  it('displays AI recommendation after clicking Analyze', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        environment: 'dev',
        severity: 'High',
        rootCause: 'Memory leak in container',
        recommendation: 'Increase memory limits and add liveness probe',
      },
    });

    render(<App />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Increase memory limits and add liveness probe/)
      ).toBeInTheDocument();
    });
  });

  it('displays severity from AI response', async () => {
    axios.post.mockResolvedValueOnce({
      data: { environment: 'dev', severity: 'Critical', rootCause: 'OOMKilled', recommendation: 'Scale up node pool' },
    });

    render(<App />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/Critical/)).toBeInTheDocument();
    });
  });

  it('displays root cause from AI response', async () => {
    axios.post.mockResolvedValueOnce({
      data: { environment: 'dev', severity: 'High', rootCause: 'OOMKilled', recommendation: 'Scale up node pool' },
    });

    render(<App />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/OOMKilled/)).toBeInTheDocument();
    });
  });

  it('renders remediation steps when present', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        environment: 'dev',
        severity: 'High',
        rootCause: 'Crash',
        recommendation: 'Fix it',
        remediationSteps: ['Check pod logs', 'Verify ConfigMap'],
      },
    });

    render(<App />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.getByText('Check pod logs')).toBeInTheDocument();
      expect(screen.getByText('Verify ConfigMap')).toBeInTheDocument();
    });
  });

  it('posts to /api/analyze with the selected environment and an issue string', async () => {
    axios.post.mockResolvedValueOnce({
      data: { environment: 'dev', severity: 'Low', rootCause: 'N/A', recommendation: 'Monitor' },
    });

    render(<App />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
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
    axios.post.mockResolvedValueOnce({
      data: { environment: 'dev', severity: 'High', rootCause: 'Crash', recommendation: 'Fix it' },
    });

    render(<App />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.getByText('No analysis yet.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));

    await waitFor(() => {
      expect(screen.queryByText('No analysis yet.')).not.toBeInTheDocument();
    });
  });
});
