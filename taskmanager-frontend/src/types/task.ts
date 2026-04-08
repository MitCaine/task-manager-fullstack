export interface Task {
  taskID: number;
  title: string;
  description?: string;
  dateTimeScheduled?: string | null;
  userID?: number | null;
}
