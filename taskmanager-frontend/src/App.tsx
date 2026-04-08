import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { Task } from './types/task';
import { getTasks, createTask, deleteTask } from './api/tasks';
import { buildDateTimeString } from './utils/dateTime';

type Ampm = 'AM' | 'PM';

function App(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [hour, setHour] = useState<string>('12');
  const [minute, setMinute] = useState<string>('00');
  const [ampm, setAmpm] = useState<Ampm>('AM');
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [isEuropeanDate, setIsEuropeanDate] = useState<boolean>(false);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch(err => console.error('Failed to load tasks:', err));
  }, []);

  const addTask = async (): Promise<void> => {
    if (input.trim() === '') return;

    const dateTimeScheduled = date
      ? buildDateTimeString(date, hour, minute, ampm, is24Hour)
      : null;

    try {
      const saved = await createTask({ title: input, description: '', dateTimeScheduled });
      setTasks(prev => [...prev, saved]);
      setInput('');
      setDate('');
      setHour('12');
      setMinute('00');
      setAmpm('AM');
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const removeTask = async (id: number): Promise<void> => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(task => task.taskID !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') addTask();
  };

  // Computed once per render, not inside the JSX map
  const hourOptions = useMemo(
    () => is24Hour
      ? Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
      : Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    [is24Hour]
  );

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
    []
  );

  const dateLocale = isEuropeanDate ? 'en-GB' : 'en-US';

  return (
    <div className="app">
      <div className="card">
        <h1 className="app__title">Task Manager</h1>

        <div className="controls">
          <input
            className="input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a task title"
          />

          <input
            className="input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          <div className="row">
            <select className="select" value={hour} onChange={e => setHour(e.target.value)}>
              {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
            </select>

            <span>:</span>

            <select className="select" value={minute} onChange={e => setMinute(e.target.value)}>
              {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {!is24Hour && (
              <select className="select" value={ampm} onChange={e => setAmpm(e.target.value as Ampm)}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            )}
          </div>

          <button className="btn" onClick={addTask}>Add</button>
        </div>

        <div className="row mtop">
          <button className="btn btn--ghost" onClick={() => setIs24Hour(p => !p)}>
            {is24Hour ? 'Switch to 12-hour format' : 'Switch to 24-hour format'}
          </button>
          <button className="btn btn--ghost" onClick={() => setIsEuropeanDate(p => !p)}>
            {isEuropeanDate ? 'Switch to MM/DD/YYYY' : 'Switch to DD/MM/YYYY'}
          </button>
        </div>

        <ul className="list">
          {tasks.map(task => (
            <li className="item" key={task.taskID}>
              <div>
                <p className="item__title">{task.title}</p>
                <div className="item__meta">
                  {task.dateTimeScheduled
                    ? new Date(task.dateTimeScheduled).toLocaleString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: !is24Hour,
                      })
                    : 'No due date'}
                </div>
              </div>

              <div className="item__actions">
                <button className="btn btn--danger" onClick={() => removeTask(task.taskID)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="spread mtop small">
          <span>Total: {tasks.length}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
