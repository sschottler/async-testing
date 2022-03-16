import { fetchTodos } from "./services";

test("this test will fail because we don't wait for the promise to resolve", () => {
  let value = 1;

  expect(value).toBe(1);

  console.log("we need to wait for this promise to resolve...");

  Promise.resolve(2).then((result) => {
    console.log(
      "Promise resolves asynchronously, but test already ended synchronously"
    );
    value = result;
  });

  console.log(
    "but test keeps running synchronously so assertions that depend on the promise will fail"
  );
  expect(value).toBe(2);
});

test("this test passes because it returns a promise which the test runner will wait on to resolve", () => {
  let value = 1;

  expect(value).toBe(1);

  return Promise.resolve(2)
    .then((result) => {
      value = result;
    })
    .then(() => {
      // chain on to the promise we are waiting for and only assert once it resolves:
      expect(value).toBe(2);
    });
});

test("This test also returns a promise due to async keyword, but with simpler more readable syntax", async () => {
  let value = 1;
  expect(value).toBe(1);

  value = await Promise.resolve(2);
  expect(value).toBe(2);
});

jest.mock("./services", () => ({
  fetchTodos: async () => [
    { title: "first todo", completed: false },
    { title: "second todo", completed: true },
    { title: "third todo", completed: true },
  ],
  // same as:
  // fetchTodos: () =>
  //   Promise.resolve([
  //     { title: "first todo", completed: false },
  //     { title: "second todo", completed: true },
  //     { title: "third todo", completed: true },
  //   ]),
}));

test("This should fail, but will pass because the assertion silently fails after test finishes", () => {
  // eslint warns you that you're being a very bad developer if you have assertions inside a promise that isn't returned or awaited:
  // https://github.com/jest-community/eslint-plugin-jest/blob/v25.7.0/docs/rules/valid-expect-in-promise.md
  fetchTodos()
    .then((todos) => {
      expect(todos.length).toEqual(10);
    })
    .catch(() => {});
});

test("Even if you mock a promise to resolve immediately with zero network delay, it still runs async", () => {
  // return a promise to tell test runner to await our mocked promise to resolve:
  return fetchTodos().then(
    // this callback still gets added to microtask queue and runs async after all sync calls complete on call stack
    // so we have to tell the test runner to wait by returning the promise:
    (todos) => {
      expect(todos.length).toEqual(3);
    }
  );
});

test("Awaiting a mocked promise with async syntax is usually cleaner and easier to read", async () => {
  const todos = await fetchTodos();
  expect(todos.length).toEqual(3);
});
