import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../primitives/button/button';
import { Input } from '../../primitives/input/input';

export type TextListPanelProps = {
  /** Names the input, as "Add {label}". */
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

/** Splits on whitespace and commas, trimmed, blanks dropped. */
export function parseValues(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

/** Appends what is new, keeping the existing order. */
export function addValues(current: string[], added: string[]): string[] {
  return Array.from(new Set([...current, ...added]));
}

/**
 * An input that adds values on Enter, or several at once from a paste, above the list of values
 * added so far.
 */
export function TextListPanel({ label, values, onChange, placeholder }: TextListPanelProps) {
  const [text, setText] = useState('');

  const add = (added: string[]) => {
    const next = addValues(values, added);
    if (next.length !== values.length) {
      onChange(next);
    }
  };

  return (
    <div className="flex w-80 flex-col gap-2 p-2">
      <Input
        type="text"
        autoComplete="off"
        aria-label={`Add ${label.toLowerCase()}`}
        placeholder={placeholder}
        value={text}
        onChange={e => setText(e.target.value)}
        onPaste={e => {
          const pasted = parseValues(e.clipboardData.getData('text'));
          // A single value pastes into the input as usual, so it can be checked before Enter.
          if (pasted.length > 1) {
            e.preventDefault();
            add(pasted);
          }
        }}
        onKeyDown={e => {
          // Escape still reaches the menu to close it; everything else stays out of its typeahead.
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
          if (e.key === 'Enter') {
            add(parseValues(text));
            setText('');
          }
        }}
        size="compact"
        mono
      />
      {values.length > 0 ? (
        <>
          <ul className="flex thin-scrollbar max-h-60 flex-col overflow-y-auto">
            {values.map(value => (
              <li
                key={value}
                className="flex items-center gap-1 rounded-sm pl-2 hover:bg-neutral-4"
              >
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs text-fg-default"
                  title={value}
                >
                  {value}
                </span>
                <Button
                  layout="iconOnly"
                  icon={X}
                  aria-label={`Remove ${value}`}
                  variant="ghost"
                  size="compact"
                  onClick={() => onChange(values.filter(v => v !== value))}
                />
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button
              label="Clear all"
              variant="outline"
              size="compact"
              onClick={() => onChange([])}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
