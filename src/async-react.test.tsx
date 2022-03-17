import { TodoList } from "./TodoList";
import { Names } from "./Names";
import { fetchTodos, Todo } from "./services";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("./services", () => ({
  fetchTodos: async () => [
    { title: "first todo", completed: false, id: 1 },
    { title: "second todo", completed: true, id: 2 },
    { title: "third todo", completed: true, id: 3 },
  ],
  fetchNames: async () => ["jill", "bob", "who cares"],
}));

test("This will fail - the test does not wait for promise to resolve before making assertions", () => {
  render(<TodoList />);

  expect(screen.getByText("first todo")).toBeTruthy();
});

test("This will pass because it returns a promise, but it's brittle...", () => {
  render(<TodoList />);

  return Promise.resolve().then(() => {
    expect(screen.getByText("first todo")).toBeTruthy();
  });
});

// Why is the above approach brittle?
// What if the implementation details change and now additional promises have to resolve
// before the todos state gets set? The above approach depends on there only being one promise
// Our tests should be dumb and not require too much knowledge of a component's internals
// loosely-coupled from implementation details of component
async function fetchTodosWithExtraPromise() {
  const todos = await fetchTodos();
  // pretend we have additional async promises we need to resolve before we can return data:
  await Promise.resolve("some additional promise");
  return todos;
}

const TodoListWithExtraPromise = () => (
  <TodoList fetchTodos={fetchTodosWithExtraPromise} />
);

test("This will fail because it doesn't wait long enough for the additional promise to resolve", async () => {
  render(<TodoListWithExtraPromise />);

  return Promise.resolve().then(() => {
    expect(screen.getByText("first todo")).toBeTruthy();
  });
});

test("This will pass because something something macrotasks/microtasks/event loop blablabla...", () => {
  render(<TodoListWithExtraPromise />);

  return new Promise((resolve) => {
    // schedules a macrotask instead of a microtask:
    setTimeout(resolve, 0);
  }).then(() => {
    // this only resolves after the scheduled macrotask from setTimeout runs, which will be after all microtasks
    expect(screen.getByText("first todo")).toBeTruthy();
  });
});

test("This is same as above, but using async/await syntax", async () => {
  render(<TodoListWithExtraPromise />);

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.getByText("first todo")).toBeTruthy();
});

describe("Use react-testing-library async utils", () => {
  test("waitFor", () => {
    render(<TodoListWithExtraPromise />);

    // waitFor returns a promise
    // if we return that promise, the test runner will wait for it to resolve
    // the waitFor promise will not resolve until the expect passes or it hits a timeout
    // waitFor doesn't give a damn how many promises are chained before a component's state is set
    // it just keeps checking until the UI result is there
    // so we don't have to know anything about implementation details
    // (how many microtasks or macrotasks are queued before state gets set)
    return waitFor(() => {
      expect(screen.getByText("first todo")).toBeTruthy();
    });
  });

  test("async syntax with waitFor is even easier", async () => {
    render(<TodoListWithExtraPromise />);

    await waitFor(() => {
      expect(screen.getByText("first todo")).toBeTruthy();
    });
  });

  test("If you don't return the promise or await it, eslint will scold you", () => {
    render(<TodoListWithExtraPromise />);

    // "Promise returned from `waitFor` must be handled....or ELSE!
    // https://github.com/testing-library/eslint-plugin-testing-library/blob/main/docs/rules/await-async-utils.md
    waitFor(() => {
      console.log("this runs after test has exited");
      expect(screen.getByText("first todo")).toBeTruthy();
    });

    console.log("test exits because we didn't return or await the promise...");
  });

  test("waitFor will keep running its callback until it succeeds or times out", async () => {
    const fakeTodos = [
      {
        title: "this todo takes awhile to appear",
        id: 1,
        completed: false,
        userId: 3,
      },
      { title: "second todo", id: 2, completed: false, userId: 3 },
    ];

    const fetchTodos_after_500_ms = (): Promise<Todo[]> =>
      new Promise((resolve) => setTimeout(() => resolve(fakeTodos), 500));

    render(<TodoList fetchTodos={fetchTodos_after_500_ms} />);

    let waitForRuns = 0;
    const now = new Date().getTime();

    await waitFor(() => {
      console.log(
        `waitFor callback run: ${++waitForRuns}, milliseconds passed: ${
          new Date().getTime() - now
        }`
      );
      expect(screen.getByText("this todo takes awhile to appear")).toBeTruthy();
    });
  });

  test("this will fail because waitFor will timeout after 1 second by default and data takes 2 seconds", async () => {
    const fakeTodos = [
      {
        title: "this todo takes awhile to appear",
        id: 1,
        completed: false,
        userId: 3,
      },
      { title: "second todo", id: 2, completed: false, userId: 3 },
    ];

    const fetchTodos_after_two_seconds = (): Promise<Todo[]> =>
      new Promise((resolve) => setTimeout(() => resolve(fakeTodos), 2000));

    render(<TodoList fetchTodos={fetchTodos_after_two_seconds} />);

    let waitForRuns = 0;
    const now = new Date().getTime();

    // you could override default timeout/interval of waitFor:
    // https://testing-library.com/docs/dom-testing-library/api-async/#waitfor
    // with 2nd parameter after callback like { timeout: 2000, interval: 100 }
    await waitFor(() => {
      console.log(
        `waitFor callback run: ${++waitForRuns}, milliseconds passed: ${
          new Date().getTime() - now
        }`
      );
      expect(screen.getByText("this todo takes awhile to appear")).toBeTruthy();
    });
  });

  test("You can also use findByText util, which combines waitFor and getByText", async () => {
    render(<TodoListWithExtraPromise />);

    expect(await screen.findByText("first todo")).toBeTruthy();
  });

  test("all async utils allow overriding timeout and interval", async () => {
    const fakeTodos = [
      {
        title: "this todo takes awhile to appear",
        id: 1,
        completed: false,
        userId: 3,
      },
      { title: "second todo", id: 2, completed: false, userId: 3 },
    ];
    render(
      <TodoList
        fetchTodos={() =>
          new Promise((resolve) => setTimeout(() => resolve(fakeTodos), 2000))
        }
      />
    );

    expect(
      await screen.findByText(
        "this todo takes awhile to appear",
        {},
        {
          timeout: 2500,
          interval: 500,
        }
      )
    ).toBeTruthy();
  });

  test("this will fail because we do not wait for the async UI update before assertions", () => {
    render(<Names />);
    expect(screen.queryByText("jill")).toBeFalsy();
    const button = screen.getByText("Load names");
    userEvent.click(button);

    // UI hasn't updated yet by the time this assertion runs:
    expect(screen.getByText("jill")).toBeTruthy();
  });

  test("this will pass because we wait for the UI update", async () => {
    render(<Names />);
    expect(screen.queryByText("jill")).toBeFalsy();
    const button = screen.getByText("Load names");
    userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("jill")).toBeTruthy();
    });
    // await waitFor + getByText is same as:
    // expect(await screen.findByText("jill")).toBeTruthy();
  });
});
