# Empty-State and No-Results Audit

## High Value

| Location | Current Behavior | Rating | Problem | Suggested Copy | CTA |
|---|---:|---|---|---|---|
| Task list no tasks, `taskmanager-frontend/src/App.tsx` | "No tasks yet. Add your first task from the form on the left." | Poor | "left" is wrong on mobile swipe layout. | "No tasks yet. Swipe to Add and create your first task." | Yes: "Add task" or switch to Add page |
| Completed filter no results, `taskmanager-frontend/src/App.tsx` | "No tasks in this filter." | Poor | Misses a useful state: user simply has not completed tasks. | "No completed tasks yet. Completed tasks will show here." | No |
| Overdue filter no results, `taskmanager-frontend/src/App.tsx` | "No tasks in this filter." | Poor | This should reinforce progress. | "No overdue tasks. You're all caught up." | No |
| Calendar day/week/month empty lists, `taskmanager-frontend/src/components/Calendar.tsx` | Generic "No tasks." | Poor | Does not explain the selected scope. | Day: "No tasks scheduled for this day." Week: "No tasks scheduled this week." Month: "No tasks scheduled this month." | Optional: "Add task" |
| Empty week view, `taskmanager-frontend/src/components/Calendar.tsx` | Day rows render with no task lists; can look sparse or blank. | Poor | The week can appear visually unfinished. | "No tasks scheduled this week." | Optional |
| Empty month selection/month view, `taskmanager-frontend/src/components/Calendar.tsx` | Month section says "No tasks." | Poor | Too generic for calendar context. | "No tasks scheduled in this month." | Optional |

## Medium Value

| Location | Current Behavior | Rating | Problem | Suggested Copy | CTA |
|---|---:|---|---|---|---|
| Search no results, `taskmanager-frontend/src/App.tsx` | "No matching tasks. Try a different search term or reset the current filters." | Good | Clear enough. | Keep, or shorten: "No results found. Try changing your search or filters." | Yes: Reset filters |
| Project dropdown empty, create/edit/detail, `taskmanager-frontend/src/App.tsx` | "No projects yet." with "+ New Project" nearby. | Acceptable | Could better explain next action. | "No projects yet. Create one above." | Already present |
| Tag dropdown empty, create/edit/detail, `taskmanager-frontend/src/App.tsx` | "No tags yet." with "+ New Tag" nearby. | Acceptable | Same as projects. | "No tags yet. Create one above." | Already present |
| No subtasks, `taskmanager-frontend/src/App.tsx` | "No subtasks yet." | Acceptable | Add input is visible, so okay. | "No subtasks yet. Add one above." | Already present |
| No notes, `taskmanager-frontend/src/App.tsx` | "No notes yet." | Acceptable | Add note button is visible. | "No notes yet. Add context above." | Already present |
| No reminders, `taskmanager-frontend/src/App.tsx` | "No reminders yet." | Acceptable | Add reminder controls are visible. | "No reminders yet. Add one above." | Already present |
| No attachments/links, `taskmanager-frontend/src/App.tsx` | "No links yet." | Acceptable | Good, but could name action. | "No links yet. Add a URL above." | Already present |
| Empty bulk selection, `taskmanager-frontend/src/App.tsx` | Select mode shows checkboxes, no bar until selected. | Acceptable | It is functional but has no hint. | "Select tasks to mark done or delete." | No, informational only |

## Low Value

| Location | Current Behavior | Rating | Problem | Suggested Copy | CTA |
|---|---:|---|---|---|---|
| Empty statistics data, `taskmanager-frontend/src/App.tsx` | Stats show all zeros and empty bars. | Acceptable | Not broken, but cold-start stats feel bare. | "No task activity yet. Stats update as you create and complete tasks." | No |
| Calendar upcoming agenda empty, `taskmanager-frontend/src/components/Calendar.tsx` | "No upcoming scheduled tasks." | Good | Clear and scoped. | Keep. | No |
| No completed tasks in stats | Shows `0 done`, `0% completion`. | Good | Clear numeric display. | Keep. | No |
| No overdue tasks in stats | Shows `0 overdue`. | Good | This is positive. | Keep. | No |

## Confusing Filter Cases

The highest-impact filter issue is that completed, overdue, project, tag, and priority empty states all collapse to "No tasks in this filter." That is technically correct but not helpful.

The task list should branch by `filterStatus` first for `completed` and `overdue`, because those states have different meanings:

- Completed: "No completed tasks yet. Completed tasks will show here."
- Overdue: "No overdue tasks. You're all caught up."

## Visually Broken Risk

The week calendar is the main empty-state risk. An empty week can look like a set of headers with unused space instead of a deliberate state. A single week-level empty message would make it feel intentional.
