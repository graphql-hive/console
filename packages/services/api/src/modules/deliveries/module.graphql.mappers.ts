import type { DateRange } from '../../shared/entities';
import type { DeliverySelector } from './providers/delivery-reader';

/** The selection the stats fields read for; each field runs its own query, like OperationsStats. */
export type DeliveryStatsMapper = {
  selector: DeliverySelector;
  period: DateRange;
};
