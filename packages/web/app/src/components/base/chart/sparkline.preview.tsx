import { createPreview, type NavPath } from 'react-foundry';
import { Card } from '@/components/base/card/card';
import { week } from './preview-data';
import { Sparkline } from './sparkline';

export const nav: NavPath = 'Base/Charts/Sparkline';

const BUSY = week(12_000);
const QUIET = week(2500, 7);

const HIGHEST = Math.max(...BUSY.map(([, value]) => value));

/**
 * A row of project cards. They share `max`, so the quiet project reads as quiet next to the busy
 * one instead of both filling their card.
 */
export const SharedScale = createPreview(() => (
  <div className="grid w-[48rem] grid-cols-2 gap-5">
    {[
      { name: 'gateway', data: BUSY },
      { name: 'billing', data: QUIET },
    ].map(project => (
      <Card key={project.name} variants={{ onSurface: 'raised', bodyPadding: 'none' }}>
        <div className="pb-5 pt-4">
          <Sparkline name="Requests" data={project.data} max={HIGHEST} />
          <h4 className="px-4 pt-4 text-lg font-bold">{project.name}</h4>
        </div>
      </Card>
    ))}
  </div>
));

/**
 * While loading, the card draws a flat baseline with animation off. The loaded card is a fresh
 * mount, so its data is what animates in: reload Shared Scale and each line draws in once.
 */
export const Loading = createPreview(() => (
  <div className="w-[24rem]">
    <Card variants={{ onSurface: 'raised', bodyPadding: 'none' }}>
      <div className="pb-5 pt-4">
        <Sparkline
          name="Requests"
          data={[
            [BUSY[0][0], 0],
            [BUSY[BUSY.length - 1][0], 0],
          ]}
          max={HIGHEST}
          animation={false}
        />
      </div>
    </Card>
  </div>
));
