import { useEffect, useState } from "react";
import { fetchTodos as fetchTodosNetwork, Todo } from "./services";

export type TodoListProps = {
  fetchTodos?(): Promise<Todo[]>;
};

export const TodoList = ({ fetchTodos = fetchTodosNetwork }) => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetchTodos().then((todos) => {
      setTodos(todos);
    });
  }, [fetchTodos]);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
};
