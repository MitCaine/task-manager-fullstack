import type { RecurrenceIntervalInput, RecurrenceRule as DomainRecurrenceRule } from '../../../domain/models';
import type { RecurrenceRule as RestRecurrenceRule } from '../../../types/task';
import type { RecurrenceInterval } from '../../../utils/taskRecurrence';
import { toRequiredDomainId } from './mapperUtils';

export function mapRecurrenceDtoToDomain(dto: RestRecurrenceRule): DomainRecurrenceRule {
  return {
    id: toRequiredDomainId(dto.recurrenceRuleID, 'recurrenceRuleID'),
    frequency: dto.frequency ?? null,
    intervalUnit: dto.intervalUnit ?? null,
    intervalValue: dto.intervalValue ?? null,
    timesOfRecurrence: dto.timesOfRecurrence,
    startDateTime: dto.startDateTime ?? null,
    endDateTime: dto.endDateTime ?? null,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapRecurrenceIntervalInputToDto(input: RecurrenceIntervalInput): RecurrenceInterval | null {
  if (!input) return null;
  return {
    intervalUnit: input.intervalUnit,
    intervalValue: input.intervalValue,
  };
}
