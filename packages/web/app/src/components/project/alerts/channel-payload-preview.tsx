import { useState } from 'react';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Collapsible } from '@/components/ui/primitives/collapsible/collapsible';
import { Select } from '@/components/ui/primitives/floating/select/select';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { WEBHOOK_PAYLOAD_EXAMPLES } from './webhook-payload-examples';

/** The request bodies a webhook channel receives, one per kind of notification. Collapsed until asked for. */
export function ChannelPayloadPreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    WEBHOOK_PAYLOAD_EXAMPLES.find(example => example.id === selectedId) ??
    WEBHOOK_PAYLOAD_EXAMPLES[0];
  const json = JSON.stringify(selected.body, null, 2);

  return (
    <div className="flex flex-col border-l border-line bg-surface-card px-3 py-2 xl:flex-1">
      <Collapsible trigger="Payload preview">
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-2 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Select
                aria-label="Payload type"
                options={WEBHOOK_PAYLOAD_EXAMPLES.map(example => ({
                  value: example.id,
                  label: example.label,
                }))}
                value={selected.id}
                onValueChange={setSelectedId}
                width="full"
                onSurface="raised"
              />
            </div>
            <CopyIconButton label="Copy payload" value={json} />
          </div>

          <div className="flex min-h-40 flex-1 flex-col">
            <ScrollArea axis="both" maxHeight="lg" fill>
              <pre className="text-xs leading-relaxed text-fg-secondary">{json}</pre>
            </ScrollArea>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
