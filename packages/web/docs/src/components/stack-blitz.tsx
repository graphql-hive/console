import { ReactElement } from 'react';
import { HideUntilInViewport } from './hide-until-in-viewport';

export interface IStackBlitzProps {
  /** StackBlitz id */
  stackBlitzId: string;
  file?: string;
}

export const StackBlitz = ({ stackBlitzId, file }: IStackBlitzProps): ReactElement => (
  <HideUntilInViewport fallback={<div style={{ height: 500 }} />}>
    <iframe
      title={`stackBlitz-${stackBlitzId}`}
      className="mt-6"
      src={`https://stackblitz.com/edit/${stackBlitzId}?ctl=1&embed=1${
        file ? `&file=${file}` : ''
      }`}
      allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
      sandbox="allow-modals allow-forms allow-popups allow-scripts"
      style={{
        width: '100%',
        height: 500,
        border: 0,
        borderRadius: 4,
        overflow: ' hidden',
      }}
    />
  </HideUntilInViewport>
);
