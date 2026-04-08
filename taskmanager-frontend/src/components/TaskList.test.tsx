import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskList from './TaskList';
import type { Task } from '../types/task';

const tasks: Task[] = [
  { taskID: 1, title: 'Buy milk', dateTimeScheduled: null },
  { taskID: 2, title: 'Walk dog', dateTimeScheduled: null },
];

// -------------------------------------------------------------------------
// Edge case — empty list
// -------------------------------------------------------------------------

test('renders "No tasks yet." when task list is empty', () => {
  render(<TaskList tasks={[]} onDelete={() => {}} />);
  expect(screen.getByText('No tasks yet.')).toBeInTheDocument();
});

test('renders no list items when task list is empty', () => {
  render(<TaskList tasks={[]} onDelete={() => {}} />);
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

// -------------------------------------------------------------------------
// Regular cases
// -------------------------------------------------------------------------

test('renders all task titles', () => {
  render(<TaskList tasks={tasks} onDelete={() => {}} />);
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(screen.getByText('Walk dog')).toBeInTheDocument();
});

test('renders a Remove button for each task', () => {
  render(<TaskList tasks={tasks} onDelete={() => {}} />);
  const buttons = screen.getAllByRole('button', { name: /remove/i });
  expect(buttons).toHaveLength(2);
});

test('calls onDelete with the correct taskID when Remove is clicked', () => {
  const onDelete = jest.fn();
  render(<TaskList tasks={tasks} onDelete={onDelete} />);

  const buttons = screen.getAllByRole('button', { name: /remove/i });
  userEvent.click(buttons[0]);
  expect(onDelete).toHaveBeenCalledWith(1);

  userEvent.click(buttons[1]);
  expect(onDelete).toHaveBeenCalledWith(2);
});
