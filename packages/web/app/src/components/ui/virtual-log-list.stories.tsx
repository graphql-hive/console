import { useEffect, useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { VirtualLogList, type LogEntry } from './virtual-log-list';

export default {
  title: 'UI / VirtualLogList',
} satisfies StoryDefault;

const sampleMessages = [
  'OIDC discovery document fetched successfully',
  'Token validation started for client_id=hive-console',
  'ID token signature verified with RS256',
  'Claims extracted: sub=user-123, email=user@example.com',
  'User session created, redirecting to callback URL',
  'Authorization code exchange completed',
  'Refresh token rotation initiated',
  'Access token issued, expires_in=3600',
  'Userinfo endpoint called successfully',
  'Logout request received, clearing session',
];

function generateLog(index: number): LogEntry {
  const now = new Date();
  now.setSeconds(now.getSeconds() - (100 - index));
  return {
    timestamp: now.toISOString(),
    message: sampleMessages[index % sampleMessages.length],
  };
}

const staticLogs: LogEntry[] = Array.from({ length: 100 }, (_, i) => generateLog(i));

export const Default: Story = () => (
  <div className="p-8">
    <p className="text-neutral-11 mb-2 text-sm">100 pre-loaded log entries (scrollable):</p>
    <VirtualLogList logs={staticLogs} className="h-[300px]" />
  </div>
);

export const StreamingLogs: Story = () => {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    Array.from({ length: 5 }, (_, i) => generateLog(i)),
  );

  useEffect(() => {
    let index = 5;
    const interval = setInterval(() => {
      setLogs(prev => [...prev, generateLog(index++)]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <p className="text-neutral-11 mb-2 text-sm">
        Streaming logs (new entry every 500ms, auto-scrolls to bottom):
      </p>
      <p className="text-neutral-10 mb-4 text-xs">{logs.length} entries</p>
      <VirtualLogList logs={logs} className="h-[300px]" />
    </div>
  );
};

export const Empty: Story = () => (
  <div className="p-8">
    <p className="text-neutral-11 mb-2 text-sm">Empty log list:</p>
    <VirtualLogList logs={[]} className="h-[300px]" />
  </div>
);
