import type { RecurrenceIntervalInput, RecurrenceRule as DomainRecurrenceRule } from '../../../domain/models';
import type { RecurrenceRule as RestRecurrenceRule } from '../../../types/task';
import type { RecurrenceInterval } from '../../../utils/taskRecurrence';
import { MISSING_REST_TIMESTAMP, toDomainId } from './mapperUtils';

export function mapRecurrenceDtoToDomain(dto: RestRecurrenceRule): DomainRecurrenceRule {
  return {
    id: toDomainId(dto.recurrenceRuleID),
    frequency: dto.frequency ?? null,
    intervalUnit: dto.intervalUnit ?? null,
    intervalValue: dto.intervalValue ?? null,
    timesOfRecurrence: dto.timesOfRecurrence,
    startDateTime: dto.startDateTime ?? null,
    endDateTime: dto.endDateTime ?? null,
    createdAt: MISSING_REST_TIMESTAMP,
    updatedAt: MISSING_REST_TIMESTAMP,
  };
}

export function mapRecurrenceIntervalInputToDto(input: RecurrenceIntervalInput): RecurrenceInterval | null {
  if (!input) return null;
  return {
    intervalUnit: input.intervalUnit,
    intervalValue: input.intervalValue,
  };
}
