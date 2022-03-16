export type Todo = {
  title: string;
  id: number;
  userId: number;
  completed: boolean;
};

export type User = {
  name: string;
};

export const fetchTodos = async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/todos");
  const todos: Todo[] = await response.json();
  return todos.slice(0, 20);
};

export const fetchNames = async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/users");
  const users: User[] = await response.json();
  return users.map((user) => user.name);
};
