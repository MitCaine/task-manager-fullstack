import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'fs';
import Calendar from './Calendar';
import type { Task } from '../types/task';
import { getLocalWeekStart, toLocalDateTimeString } from '../utils/dateTime';

const renderCalendar = (tasks: Task[] = [], hideCompleted = false, projects: Array<{ projectID: number; title: string }> = []) => {
  const onEditTask = jest.fn();
  return {
    ...render(
      <Calendar
        tasks={tasks}
        projects={projects}
        is24Hour={false}
        isEuropeanDate={false}
        onEditTask={onEditTask}
        hideCompleted={hideCompleted}
        onToggleHideCompleted={jest.fn()}
      />
    ),
    onEditTask,
  };
};

const mockDesktopCalendarQuery = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

const clickCalendar = async (element: Element) => {
  await act(async () => {
    await userEvent.click(element);
  });
};

const openYearOverview = async () => {
  await clickCalendar(screen.getByRole('button', { name: String(new Date().getFullYear()) }));
};

const futureTask = (overrides: Partial<Task> = {}): Task => {
  const scheduled = new Date(Date.now() + 10 * 60 * 1000);
  const localDateTime = `${scheduled.getFullYear()}-${String(scheduled.getMonth() + 1).padStart(2, '0')}-${String(scheduled.getDate()).padStart(2, '0')}T${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}:00`;
  return {
    taskID: 1,
    title: 'Recurring calendar task',
    dateTimeScheduled: localDateTime,
    recurrenceRuleID: 10,
    ...overrides,
  };
};

const calendarTags = [
  { tagID: 1, title: 'First', color: '#ef4444' },
  { tagID: 2, title: 'Second', color: '#22c55e' },
  { tagID: 3, title: 'Third', color: '#3b82f6' },
  { tagID: 4, title: 'Fourth', color: '#a855f7' },
];

const currentWeekTask = (dayOffset: number, overrides: Partial<Task> = {}): Task => {
  const date = getLocalWeekStart(new Date());
  date.setDate(date.getDate() + dayOffset);
  date.setHours(9, 0, 0, 0);
  return {
    taskID: dayOffset + 10,
    title: `Week task ${dayOffset}`,
    dateTimeScheduled: toLocalDateTimeString(date),
    recurrenceRuleID: null,
    statusID: null,
    ...overrides,
  };
};

const getCalendarTaskEntry = () => {
  const taskEntry = screen.getByText('Recurring calendar task').closest('.cal-item');
  if (!(taskEntry instanceof HTMLElement)) throw new Error('Calendar task entry not found');
  return taskEntry;
};

test('calendar week view shows a week-level empty state', () => {
  renderCalendar();

  expect(screen.getByText('No tasks scheduled this week.')).toHaveClass('cal-empty--week');
});

test('calendar week view uses Monday-start boundaries through Sunday', () => {
  renderCalendar([
    currentWeekTask(0, { taskID: 101, title: 'Monday boundary task' }),
    currentWeekTask(6, { taskID: 102, title: 'Sunday boundary task' }),
  ]);

  const labels = screen.getAllByRole('button')
    .filter(button => button.classList.contains('cal-week-row__lbl'));

  expect(labels[0]).toHaveTextContent(/^Mon\b/);
  expect(labels[6]).toHaveTextContent(/^Sun\b/);
  expect(screen.getByText('Monday boundary task')).toBeInTheDocument();
  expect(screen.getByText('Sunday boundary task')).toBeInTheDocument();
});

test('calendar month view shows month empty state', async () => {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const { container } = renderCalendar();

  await clickCalendar(screen.getByRole('button', { name: monthName }));

  expect(container.querySelector('.cal-table')).toBeInTheDocument();
  expect(screen.getByText('No tasks scheduled this month.')).toBeInTheDocument();
});

test('calendar day view shows day empty state', async () => {
  const { container } = renderCalendar();

  await clickCalendar(screen.getByRole('button', { name: new Date().toLocaleDateString('en-US', { month: 'long' }) }));
  const dayButton = container.querySelector<HTMLButtonElement>('.cal-day-btn');
  if (!dayButton) throw new Error('Expected a calendar day button');
  await clickCalendar(dayButton);

  expect(screen.getByText('No tasks scheduled for this day.')).toBeInTheDocument();
});

test('calendar recurring task entry shows a schedule repeat indicator', () => {
  renderCalendar([futureTask()]);

  const taskEntry = getCalendarTaskEntry();
  const repeatIndicator = within(taskEntry).getByLabelText('Repeats');
  expect(repeatIndicator).toHaveClass('repeat-indicator');
  expect(repeatIndicator.closest('.cal-item__time')).toBeInTheDocument();
});

test.each([
  { count: 0, expected: [] },
  { count: 1, expected: ['First'] },
  { count: 2, expected: ['First', 'Second'] },
])('calendar task entry with $count tags shows all tags without overflow', ({ count, expected }) => {
  renderCalendar([futureTask({ tags: calendarTags.slice(0, count) })]);

  const taskEntry = getCalendarTaskEntry();
  const tagChips = taskEntry.querySelectorAll('.cal-item__tag-chip');
  expect(tagChips).toHaveLength(count);
  expected.forEach(title => expect(within(taskEntry).getByText(title)).toBeInTheDocument());
  expect(within(taskEntry).queryByLabelText(/more tags/i)).not.toBeInTheDocument();
});

test('calendar task entry shows two tags plus an accessible overflow indicator', () => {
  renderCalendar([futureTask({ tags: calendarTags })]);

  const taskEntry = getCalendarTaskEntry();
  expect(within(taskEntry).getByText('First')).toBeInTheDocument();
  expect(within(taskEntry).getByText('Second')).toBeInTheDocument();
  expect(within(taskEntry).queryByText('Third')).not.toBeInTheDocument();
  expect(within(taskEntry).queryByText('Fourth')).not.toBeInTheDocument();

  const overflow = within(taskEntry).getByLabelText('More tags: Third, Fourth');
  expect(overflow).toHaveTextContent('+2');
  expect(overflow).toHaveAttribute('title', 'More tags: Third, Fourth');
});

test('calendar project and tag chips share a wrapping body metadata row', () => {
  renderCalendar(
    [futureTask({ projectID: 7, tags: calendarTags })],
    false,
    [{ projectID: 7, title: 'Wedding Planning' }],
  );

  const taskEntry = getCalendarTaskEntry();
  const body = taskEntry.querySelector('.cal-item__body');
  const metadata = taskEntry.querySelector('.cal-item__meta');
  const statusBadges = taskEntry.querySelector('.cal-item__badges');
  if (!(body instanceof HTMLElement) || !(metadata instanceof HTMLElement) || !(statusBadges instanceof HTMLElement)) {
    throw new Error('Expected calendar task body metadata and status areas');
  }

  expect(body).toContainElement(metadata);
  expect(metadata).toContainElement(within(taskEntry).getByText('Wedding Planning'));
  expect(metadata).toContainElement(within(taskEntry).getByText('First'));
  expect(metadata).toContainElement(within(taskEntry).getByLabelText('More tags: Third, Fourth'));
  expect(statusBadges.querySelector('.cal-item__tag-chip')).not.toBeInTheDocument();

  const css = readFileSync(`${process.cwd()}/src/components/Calendar.css`, 'utf8');
  const bodyRule = css.match(/\.cal-item__body\s*\{[^}]*\}/)?.[0] ?? '';
  const metadataRule = css.match(/\.cal-item__meta\s*\{[^}]*\}/)?.[0] ?? '';
  expect(bodyRule).toContain('width: 100%');
  expect(metadataRule).toContain('display: flex');
  expect(metadataRule).toContain('flex-wrap: wrap');
});

test('calendar task entry uses a stacked schedule title description and metadata hierarchy', async () => {
  const { onEditTask } = renderCalendar(
    [futureTask({
      description: 'Calendar task description',
      priority: 'HIGH',
      projectID: 7,
      tags: calendarTags,
    })],
    false,
    [{ projectID: 7, title: 'Wedding Planning' }],
  );

  const taskEntry = getCalendarTaskEntry();
  const scheduleRow = taskEntry.querySelector('.cal-item__schedule-row');
  const body = taskEntry.querySelector('.cal-item__body');
  const title = taskEntry.querySelector('.cal-item__title');
  const description = taskEntry.querySelector('.cal-item__desc');
  const metadata = taskEntry.querySelector('.cal-item__meta');
  const statusBadges = taskEntry.querySelector('.cal-item__badges');
  if (
    !(scheduleRow instanceof HTMLElement)
    || !(body instanceof HTMLElement)
    || !(title instanceof HTMLElement)
    || !(description instanceof HTMLElement)
    || !(metadata instanceof HTMLElement)
    || !(statusBadges instanceof HTMLElement)
  ) {
    throw new Error('Expected stacked calendar task entry structure');
  }

  expect(scheduleRow).toContainElement(taskEntry.querySelector('.cal-item__time'));
  expect(scheduleRow).toContainElement(statusBadges);
  expect(statusBadges).toContainElement(within(taskEntry).getByText('High'));
  expect(body).toContainElement(title);
  expect(body).toContainElement(description);
  expect(body).toContainElement(metadata);
  expect(statusBadges.querySelector('.cal-item__tag-chip')).not.toBeInTheDocument();

  await clickCalendar(taskEntry);
  expect(onEditTask).toHaveBeenCalledWith(1);

  const css = readFileSync(`${process.cwd()}/src/components/Calendar.css`, 'utf8');
  const itemRule = css.match(/^\.cal-item\s*\{[^}]*\}/m)?.[0] ?? '';
  const scheduleRule = css.match(/^\.cal-item__schedule-row\s*\{[^}]*\}/m)?.[0] ?? '';
  expect(itemRule).toContain('flex-direction: column');
  expect(scheduleRule).toContain('display: flex');
  expect(scheduleRule).toContain('flex-wrap: wrap');
});

test('month and day calendar task entries use the shared tag overflow display', async () => {
  const { container } = renderCalendar([futureTask({ tags: calendarTags.slice(0, 3) })]);
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  await clickCalendar(screen.getByRole('button', { name: monthName }));
  expect(within(getCalendarTaskEntry()).getByLabelText('More tags: Third')).toHaveTextContent('+1');

  const taskDayButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.cal-day-btn'))
    .find(button => button.getAttribute('aria-label')?.includes(', 1 task'));
  if (!taskDayButton) throw new Error('Expected a calendar day button with one task');
  await clickCalendar(taskDayButton);

  expect(within(getCalendarTaskEntry()).getByLabelText('More tags: Third')).toHaveTextContent('+1');
});

test('calendar upcoming recurring task shows a schedule repeat indicator', async () => {
  renderCalendar([futureTask()]);

  await openYearOverview();

  const agendaEntry = screen.getByText('Recurring calendar task').closest('.cal-agenda__item');
  if (!(agendaEntry instanceof HTMLElement)) throw new Error('Calendar agenda entry not found');
  const repeatIndicator = within(agendaEntry).getByLabelText('Repeats');
  expect(repeatIndicator).toHaveClass('repeat-indicator');
  expect(repeatIndicator.closest('.cal-agenda__time')).toBeInTheDocument();
});

test('calendar overview keeps four-month ranges outside desktop shell', async () => {
  mockDesktopCalendarQuery(false);
  const { container } = renderCalendar();

  await openYearOverview();

  expect(container.querySelectorAll('.cal-mini')).toHaveLength(4);
  expect(screen.getByRole('button', { name: /Jan - Apr|May - Aug|Sep - Dec/ })).toBeInTheDocument();
});

test('calendar overview uses three-month ranges in desktop shell', async () => {
  mockDesktopCalendarQuery(true);
  const { container } = renderCalendar();

  await openYearOverview();

  expect(container.querySelectorAll('.cal-mini')).toHaveLength(3);
  expect(screen.getByRole('button', { name: /Jan-Mar|Apr-Jun|Jul-Sep|Oct-Dec/ })).toBeInTheDocument();
});

test('show and hide done controls keep the stable width styling hook', () => {
  mockDesktopCalendarQuery(false);

  const hiddenState = renderCalendar([], false);
  const hideButton = screen.getByRole('button', { name: /hide done/i });
  expect(hideButton).toHaveClass('cal-hide-completed');
  hiddenState.unmount();

  renderCalendar([], true);
  const showButton = screen.getByRole('button', { name: /show done/i });
  expect(showButton).toHaveClass('cal-hide-completed');

  const css = readFileSync(`${process.cwd()}/src/components/Calendar.css`, 'utf8');
  const toggleRule = css.match(/\.cal-hide-completed\s*\{[^}]*\}/)?.[0] ?? '';
  expect(toggleRule).toContain('min-width: 6.4rem');
});
