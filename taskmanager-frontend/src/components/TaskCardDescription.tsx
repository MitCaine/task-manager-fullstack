type TaskCardDescriptionProps = {
  description?: string;
};

function TaskCardDescription({ description }: TaskCardDescriptionProps) {
  if (!description) return null;

  return <p className="item__desc">{description}</p>;
}

export default TaskCardDescription;
