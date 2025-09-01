'use client';

import React from 'react';
import { GithubIcon, RabbitIcon, RouteIcon, TargetIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-neutral-800 transition-colors hover:bg-neutral-800/25',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn('whitespace-nowrap p-2 text-left align-middle font-medium', className)}
      {...props}
    />
  );
}
function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('whitespace-nowrap p-2 align-middle', className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-sm text-neutral-400', className)}
      {...props}
    />
  );
}

const testCasesTotal = 189;
const testSuitesTotal = 42;
const gateways = [
  {
    name: 'Hive Router',
    version: 'main',
    rps: 1831.09,
    p95: 48.58,
    p99_9: 78.84,
    mem: 48,
    cpu: 167.0,
    okTestCases: 189,
    okTestSuites: 42,
  },
  {
    name: 'Apollo Router',
    version: 'v2.6.0',
    rps: 329.84,
    p95: 196.46,
    p99_9: 472.21,
    cpu: 270.0,
    mem: 192,
    okTestCases: 185,
    okTestSuites: 40,
  },
  {
    name: 'Grafbase Gateway',
    version: 'v0.48.1',
    rps: 461.19,
    p95: 137.81,
    p99_9: 395.73,
    cpu: 133.0,
    mem: 94,
    okTestCases: 171,
    okTestSuites: 35,
  },
  {
    name: 'Cosmo Router',
    version: 'v0.247.0',
    rps: 585.79,
    p95: 128.25,
    p99_9: 348.17,
    cpu: 263,
    mem: 119,
    okTestCases: 179,
    okTestSuites: 36,
  },
];

export function BenchmarkResultsTable() {
  const rows = gateways.slice();
  rows.sort((a, b) => b.rps - a.rps);

  return (
    <Table className="mt-6 font-mono">
      <TableHeader>
        <TableRow className="bg-neutral-800/50">
          <TableHead className="w-[100px]">
            Gateway
            <br />
            <span className="text-neutral-400">version</span>
          </TableHead>
          <TableHead className="text-center">
            RPS
            <br />
            <span className="text-neutral-400">reqs/s</span>
          </TableHead>
          <TableHead className="text-center">
            P95
            <br />
            <span className="text-neutral-400">ms</span>
          </TableHead>
          <TableHead className="text-center">
            P99.9
            <br />
            <span className="text-neutral-400">ms</span>
          </TableHead>
          <TableHead className="text-center">
            CPU
            <br />
            <span className="text-neutral-400">max %</span>
          </TableHead>
          <TableHead className="text-center">
            MEM
            <br />
            <span className="text-neutral-400">max MB</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => {
          return (
            <TableRow key={row.name}>
              <TableCell>
                <div className="font-medium">{row.name}</div>
                <span className="text-xs text-neutral-400">{row.version}</span>
              </TableCell>
              <TableCell className="text-center">{row.rps}</TableCell>
              <TableCell className="text-center">{row.p95}</TableCell>
              <TableCell className="text-center">{row.p99_9}</TableCell>
              <TableCell className="text-center">{row.cpu}</TableCell>
              <TableCell className="text-center">{row.mem}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableCaption className="text-xs">
        Results from our open-source{' '}
        <a
          href="http://the-guild.dev/graphql/hive/federation-gateway-performance/#/constant"
          className="underline"
          target="_blank"
          title="Open Source GraphQL federation gateways performance benchmark"
        >
          benchmark
        </a>
      </TableCaption>
    </Table>
  );
}

export function AuditResultsTable() {
  const rows = gateways.slice();
  rows.sort((a, b) => b.okTestCases - a.okTestCases);

  return (
    <Table className="mt-6 font-mono">
      <TableHeader>
        <TableRow className="bg-neutral-800/50">
          <TableHead className="w-[100px]">Gateway</TableHead>
          <TableHead className="text-center">Compatibility</TableHead>
          <TableHead className="text-center">Test Cases</TableHead>
          <TableHead className="text-center">Test Suites</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => {
          return (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-center font-medium">
                {((row.okTestCases * 100) / testCasesTotal).toFixed(2)}
                <span className="text-neutral-400">%</span>
              </TableCell>
              <TableCell className="space-x-2 text-center">
                <span className="text-green-500">✓ {row.okTestCases}</span>
                {testCasesTotal - row.okTestCases > 0 ? (
                  <span className="text-red-500">✗ {testCasesTotal - row.okTestCases}</span>
                ) : null}
              </TableCell>
              <TableCell className="space-x-2 text-center">
                <span className="text-green-500">✓ {row.okTestSuites}</span>
                {testSuitesTotal - row.okTestSuites > 0 ? (
                  <span className="text-red-500">✗ {testSuitesTotal - row.okTestSuites}</span>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableCaption className="text-xs">
        Results from our open-source{' '}
        <a
          href="http://the-guild.dev/graphql/hive/federation-gateway-audit"
          className="underline"
          target="_blank"
          title="Open Source GraphQL federation gateways compatibility audit"
        >
          audit
        </a>
      </TableCaption>
    </Table>
  );
}

export function RPSRace() {
  const data = gateways.slice();
  const max = Math.max(...data.map(d => d.rps));
  const sorted = [...data].sort((a, b) => b.rps - a.rps);
  const [hovered, setHovered] = React.useState<(typeof data)[0] | null>(null);
  const first = sorted[0];

  return (
    <div className="my-4 space-y-3 font-mono">
      {sorted.map(d => (
        <div
          key={d.name}
          onMouseEnter={() => (d.name === first.name ? null : setHovered(d))}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-neutral-300">{d.name}</span>
            <span className="text-sm tabular-nums text-zinc-400">
              {d.name === first.name && hovered
                ? `${(first.rps / hovered.rps).toFixed(1)}x faster | `
                : null}
              {d.rps.toFixed(0)} rps
            </span>
          </div>
          <div className="h-[5px] overflow-hidden bg-zinc-800">
            <div
              className="h-full bg-sky-600/90 transition-[width] duration-1000 ease-out dark:bg-sky-600"
              style={{ width: `${(d.rps / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LatencyBands() {
  const data = gateways.slice();
  data.sort((a, b) => a.p99_9 - b.p99_9);
  const max = Math.max(...data.map(d => d.p99_9));
  return (
    <div className="my-4 space-y-5 font-mono">
      {data.map(d => (
        <div key={d.name} className="">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{d.name}</span>
            <span className="tabular-nums text-neutral-400">
              p95 {d.p95.toFixed(1)} ms | p99.9 {d.p99_9.toFixed(1)} ms
            </span>
          </div>
          <div className="relative h-4 border border-zinc-800 bg-zinc-900">
            {/*<div className="absolute inset-y-0 left-0 right-0 m-2 border-b border-zinc-800" />*/}
            <div
              title={`p95 ${d.p95}ms`}
              className="absolute top-1/2 h-full w-[4px] -translate-y-1/2 bg-sky-600"
              style={{ left: `${(d.p95 / max) * 100}%` }}
            />
            <div
              title={`p99.9 ${d.p99_9}ms`}
              className="absolute top-1/2 h-full w-[4px] -translate-y-1/2 bg-rose-600"
              style={{ left: `${(d.p99_9 / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="text-center text-xs text-neutral-400">
        Axis scaled to the highest p99.9 across gateways
      </div>
    </div>
  );
}

const COLORS = ['#a3e635', '#60a5fa', '#f472b6', '#facc15', '#34d399', '#f87171']; // lime, sky, pink, amber, teal, red

type SpeedwayVariant = 'simple' | 'fancy';

export function GatewaySpeedway({ variant = 'fancy' }: { variant?: SpeedwayVariant }) {
  const data = gateways.slice();
  const [running, setRunning] = React.useState(true);
  const [mult, setMult] = React.useState(1.0); // global speed multiplier
  const [normalize, setNormalize] = React.useState(true); // divide by max RPS
  const [state, setState] = React.useState(() => data.map(() => ({ dist: 10, laps: 0 })));
  const last = React.useRef<number | null>(null);
  const maxRps = Math.max(...data.map(d => d.rps));

  // track + geometry
  const w = 720,
    h = 420; // svg size
  const left = 90,
    right = w - 90,
    top = 60,
    bottom = h - 60,
    corner = 70;
  const trackD = `M ${left + corner} ${top}
             H ${right - corner}
             A ${corner} ${corner} 0 0 1 ${right} ${top + corner}
             V ${bottom - corner}
             A ${corner} ${corner} 0 0 1 ${right - corner} ${bottom}
             H ${left + corner}
             A ${corner} ${corner} 0 0 1 ${left} ${bottom - corner}
             V ${top + corner}
             A ${corner} ${corner} 0 0 1 ${left + corner} ${top}
             Z`;

  const trackRef = React.useRef<SVGPathElement | null>(null);
  const [trackLen, setTrackLen] = React.useState(1);
  React.useEffect(() => {
    if (trackRef.current) setTrackLen(trackRef.current.getTotalLength());
  }, [trackD]);

  // animation loop
  React.useEffect(() => {
    let raf = 0;
    const basePxPerSec = 260; // for top RPS at mult=1
    const tick = (t: number) => {
      if (last.current == null) last.current = t;
      const dt = (t - last.current) / 1000;
      last.current = t;
      if (running) {
        setState(prev =>
          prev.map((s, i) => {
            const rps = data[i].rps;
            const ratio = normalize ? rps / maxRps : rps / Math.max(1, 1000);
            let dist = s.dist + dt * basePxPerSec * mult * ratio;
            let laps = s.laps;
            if (dist >= trackLen) {
              laps += Math.floor(dist / trackLen);
              dist = dist % trackLen;
            }
            return { dist, laps };
          }),
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, mult, normalize, data, maxRps, trackLen]);

  const reset = () => {
    setState(data.map(() => ({ dist: 10, laps: 0 })));
    last.current = null;
  };

  // ranking by distance (laps + partial)
  const ranking = state
    .map((s, i) => ({
      i,
      name: data[i].name,
      rps: data[i].rps,
      color: COLORS[i % COLORS.length],
      distance: s.laps + s.dist / trackLen,
      laps: s.laps,
    }))
    .sort((a, b) => b.distance - a.distance);

  // finish line placement at path length 0 (render vertical/upwards)
  function pointAndAngleAt(len: number) {
    if (!trackRef.current) return { x: 0, y: 0, ang: 0 };
    const p = trackRef.current.getPointAtLength(len);
    const p2 = trackRef.current.getPointAtLength(Math.min(len + 1, trackLen));
    const ang = Math.atan2(p2.y - p.y, p2.x - p.x) * (180 / Math.PI);
    return { x: p.x, y: p.y, ang };
  }
  const finish = pointAndAngleAt(0);
  const trackStroke = 86; // road width

  // Simple car
  const SimpleCar = ({ color }: { color: string }) => (
    <g>
      <rect x={-10} y={-6} width={22} height={12} rx={3} fill={color} />
      <rect x={-10} y={-6} width={22} height={12} rx={3} fill="#ffffff0f" />
      <circle r={2} cx={-6} cy={8} fill="#111" />
      <circle r={2} cx={6} cy={8} fill="#111" />
      <circle r={2} cx={-6} cy={-8} fill="#111" />
      <circle r={2} cx={6} cy={-8} fill="#111" />
    </g>
  );

  // Fancy car sprite
  function CarSpriteFancy({
    color,
    name,
    dist,
    index,
    speedRatio,
  }: {
    color: string;
    name: string;
    dist: number;
    index: number;
    speedRatio: number;
  }) {
    const L = 28,
      W = 14; // body size
    const wheelR = 3;
    const wheelCirc = 2 * Math.PI * wheelR;
    const wheelAngle = ((dist / wheelCirc) * 180) / Math.PI; // degrees
    const stripe = '#ffffff24';
    const darker = '#00000040';
    const trail = 6 + speedRatio * 18;
    const trailOpacity = 0.18 + speedRatio * 0.22;

    const Wheel = ({ x, y }: { x: number; y: number }) => (
      <g transform={`translate(${x},${y}) rotate(${wheelAngle})`}>
        <circle r={wheelR} fill="#0b0b0b" stroke="#1f1f1f" strokeWidth={0.8} />
        <line x1={-wheelR} y1={0} x2={wheelR} y2={0} stroke="#3a3a3a" strokeWidth={0.8} />
        <line x1={0} y1={-wheelR} x2={0} y2={wheelR} stroke="#3a3a3a" strokeWidth={0.8} />
      </g>
    );

    return (
      <g>
        {/* speed trail */}
        <polygon
          points={`${-L / 2 - trail},${-W / 4} ${-L / 2},${-W / 2} ${-L / 2},${W / 2} ${-L / 2 - trail},${W / 4}`}
          fill={color}
          opacity={trailOpacity}
        />

        {/* body shadow */}
        <rect x={-L / 2} y={-W / 2} width={L} height={W} rx={W / 3} fill="#000" opacity={0.25} />

        {/* main body with gloss */}
        <rect x={-L / 2} y={-W / 2} width={L} height={W} rx={W / 3} fill={color} />
        <linearGradient id="carGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff40" />
          <stop offset="60%" stopColor="#ffffff10" />
          <stop offset="100%" stopColor="#00000000" />
        </linearGradient>
        <rect x={-L / 2} y={-W / 2} width={L} height={W} rx={W / 3} fill="url(#carGloss)" />

        {/* stripes */}
        <rect x={-L / 2 + 2} y={-5} width={L - 10} height={1.6} fill={stripe} />
        <rect x={-L / 2 + 2} y={-1.5} width={L - 4} height={2.2} fill={stripe} />

        {/* windshield */}
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#93c5fdcc" />
          <stop offset="100%" stopColor="#38bdf8aa" />
        </linearGradient>
        <rect x={L / 8} y={-W / 3} width={L / 3} height={W / 1.5} rx={2} fill="url(#glass)" />

        {/* spoilers */}
        <rect x={L / 2 - 2} y={-W / 2} width={3} height={W} rx={1} fill={darker} />
        <rect x={-L / 2 - 1} y={-W / 2} width={2} height={W} rx={1} fill={darker} />

        {/* lights */}
        <circle cx={L / 2 - 2} cy={-W / 4} r={1.5} fill="#fde68a" />
        <circle cx={L / 2 - 2} cy={W / 4} r={1.5} fill="#fde68a" />
        <rect x={-L / 2 + 1} y={-W / 3} width={2} height={W / 3} fill="#fb7185" />

        {/* wheels with spinning spokes */}
        <Wheel x={L / 2 - 6} y={-W / 2 - 2} />
        <Wheel x={L / 2 - 6} y={W / 2 + 2} />
        <Wheel x={-L / 2 + 6} y={-W / 2 - 2} />
        <Wheel x={-L / 2 + 6} y={W / 2 + 2} />

        {/* number badge */}
        <circle cx={0} cy={0} r={4.2} fill="#111827" stroke="#374151" strokeWidth={0.8} />
        <text x={0} y={1.6} textAnchor="middle" className="fill-zinc-200 text-[8px] font-semibold">
          {index + 1}
        </text>
      </g>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-300">Gateway Speedway</div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <button
            onClick={() => setRunning(v => !v)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700"
          >
            {running ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700"
          >
            Reset
          </button>
          <label className="ml-2 flex items-center gap-2">
            <span>Speed</span>
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.05}
              value={mult}
              onChange={e => setMult(Number(e.target.value))}
            />
            <span className="tabular-nums">×{mult.toFixed(2)}</span>
          </label>
          <label className="ml-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={normalize}
              onChange={e => setNormalize(e.target.checked)}
            />
            <span>Normalize to top RPS</span>
          </label>
          <label className="ml-3 flex items-center gap-2">
            <span>Car style</span>
            <select
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1"
              value={variant}
              onChange={() => {}}
            >
              <option value="simple">Simple</option>
              <option value="fancy">Fancy</option>
            </select>
            <span className="text-zinc-500">(use prop)</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 md:col-span-2">
          <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full">
            {/* background */}
            <defs>
              <radialGradient id="bg" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#0a0a0a" />
                <stop offset="100%" stopColor="#000" />
              </radialGradient>
              <pattern id="check" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="#e5e7eb" />
                <rect width="3" height="3" x="0" y="0" fill="#111" />
                <rect width="3" height="3" x="3" y="3" fill="#111" />
              </pattern>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.5" />
              </filter>
            </defs>
            <rect x="0" y="0" width={w} height={h} fill="url(#bg)" />

            {/* track shoulders */}
            <path
              d={trackD}
              fill="none"
              stroke="#0f0f0f"
              strokeWidth={trackStroke + 10}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* main track */}
            <path
              ref={trackRef}
              d={trackD}
              fill="none"
              stroke="#18181b"
              strokeWidth={trackStroke}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* edges */}
            <path
              d={trackD}
              fill="none"
              stroke="#27272a"
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* center dashed line */}
            <path
              d={trackD}
              fill="none"
              stroke="#3f3f46"
              strokeDasharray="16 12"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* finish line: render vertical (no rotation) */}
            <g transform={`translate(${finish.x},${finish.y})`}>
              <rect
                x={-6}
                y={-trackStroke / 2}
                width={12}
                height={trackStroke}
                fill="url(#check)"
                stroke="#000"
                strokeOpacity="0.3"
              />
              <text
                x={0}
                y={-trackStroke / 2 - 8}
                textAnchor="middle"
                className="fill-zinc-400 text-[10px]"
              >
                FINISH
              </text>
            </g>

            {/* cars */}
            {state.map((s, i) => {
              if (!trackRef.current) return null;
              const p = trackRef.current.getPointAtLength(s.dist);
              const p2 = trackRef.current.getPointAtLength((s.dist + 1) % trackLen);
              const ang = Math.atan2(p2.y - p.y, p2.x - p.x) * (180 / Math.PI);
              const color = COLORS[i % COLORS.length];
              const rps = data[i].rps; // <-- FIXED: direct reference (no $1 placeholder)
              const speedRatio = normalize ? rps / maxRps : rps / Math.max(1, 1000);
              return (
                <g
                  key={i}
                  transform={`translate(${p.x},${p.y}) rotate(${ang})`}
                  filter="url(#shadow)"
                >
                  {variant === 'fancy' ? (
                    <CarSpriteFancy
                      color={color}
                      name={data[i].name}
                      dist={s.dist}
                      index={i}
                      speedRatio={speedRatio}
                    />
                  ) : (
                    <SimpleCar color={color} />
                  )}
                  <text x={0} y={-12} textAnchor="middle" className="fill-zinc-300 text-[9px]">
                    {data[i].name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* leaderboard */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="mb-2 text-xs text-zinc-400">Leaderboard (distance)</div>
          <div className="space-y-2">
            {ranking.map((r, idx) => (
              <div key={r.i} className="flex items-center gap-2">
                <div className="w-6 text-right text-sm text-zinc-500">{idx + 1}</div>
                <div className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                <div className="flex-1 text-sm text-zinc-200">{r.name}</div>
                <div className="text-xs tabular-nums text-zinc-400">{r.laps} laps</div>
                <div className="w-20 text-right text-xs tabular-nums text-zinc-500">
                  {r.rps.toFixed(0)} rps
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-zinc-500">
            Cars follow a rounded-rectangle circuit with a vertical finish line. Speed ∝ RPS.
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightItem(props: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative pl-16">
      <div className="font-semibold text-white">
        <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-lg bg-neutral-600/20">
          {props.icon}
        </div>
        {props.title}
      </div>
      <div className="text-sm text-neutral-400">{props.description}</div>
    </div>
  );
}

export function Highlights() {
  return (
    <div className="my-8 grid grid-cols-1 gap-x-4 gap-y-6 px-4 lg:grid-cols-2">
      <HighlightItem
        icon={<GithubIcon className="size-6" />}
        title="Open Source"
        description="MIT licensed, transparent, and community-driven."
      />
      <HighlightItem
        icon={<TargetIcon className="size-6" />}
        title="Apollo Federation"
        description="Fully compatible - works seamlessly with Federation standards."
      />
      <HighlightItem
        icon={<RabbitIcon className="size-6" />}
        title="Fast and Efficient"
        description="Designed in Rust for speed, low memory use, and efficiency."
      />
      <HighlightItem
        icon={<RouteIcon className="size-6" />}
        title="Familiair Query Plans"
        description="Apollo-style query plans, no new concepts to learn."
      />
    </div>
  );
}
