import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Calendar from './Calendar';
import type { Task } from '../types/task';

const renderCalendar = (tasks: Task[] = []) => render(
  <Calendar
    tasks={tasks}
    projects={[]}
    is24Hour={false}
    isEuropeanDate={false}
    onEditTask={jest.fn()}
    hideCompleted={false}
    onToggleHideCompleted={jest.fn()}
  />
);

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

const openYearOverview = async () => {
  await userEvent.click(screen.getByRole('button', { name: String(new Date().getFullYear()) }));
};

test('calendar week view shows a week-level empty state', () => {
  renderCalendar();

  expect(screen.getByText('No tasks scheduled this week.')).toHaveClass('cal-empty--week');
});

test('calendar month view shows month empty state', async () => {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const { container } = renderCalendar();

  await userEvent.click(screen.getByRole('button', { name: monthName }));

  expect(container.querySelector('.cal-table')).toBeInTheDocument();
  expect(screen.getByText('No tasks scheduled this month.')).toBeInTheDocument();
});

test('calendar day view shows day empty state', async () => {
  const { container } = renderCalendar();

  await userEvent.click(screen.getByRole('button', { name: new Date().toLocaleDateString('en-US', { month: 'long' }) }));
  const dayButton = container.querySelector<HTMLButtonElement>('.cal-day-btn');
  if (!dayButton) throw new Error('Expected a calendar day button');
  await userEvent.click(dayButton);

  expect(screen.getByText('No tasks scheduled for this day.')).toBeInTheDocument();
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
