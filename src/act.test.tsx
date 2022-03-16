import ReactDOM from "react-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Counter } from "./Counter";
import { Names } from "./Names";

jest.mock("./services", () => ({
  fetchNames: async () => ["jill", "bob", "who cares"],
}));

let container;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

test("this test will fail because it's not using act so the useEffect does not run before the assertion", () => {
  ReactDOM.render(<Counter />, container);

  const button = container.querySelector("button");
  const label = container.querySelector("p");

  expect(label.textContent).toBe("You clicked 0 times");
  // this will fail because the useEffect that sets document.title runs async after the render
  // side note: it would pass if we used useLayoutEffect instead of useEffect to set the document title, because useLayoutEffect runs sync
  expect(document.title).toBe("You clicked 0 times");
});

test("this test will pass because it is using act, which ensures the useEffect will run before the assertion", () => {
  // act blocks until react updates dom and runs effects:
  // more info: https://github.com/threepointone/react-act-examples/blob/master/sync.md
  act(() => {
    ReactDOM.render(<Counter />, container);
  });

  const button = container.querySelector("button");
  const label = container.querySelector("p");

  expect(label.textContent).toBe("You clicked 0 times");
  expect(document.title).toBe("You clicked 0 times");
});

test("this test will fail because the click is not wrapped in act so the useEffect will not run before the assertion", () => {
  // act blocks until react updates dom and runs effects:
  act(() => {
    ReactDOM.render(<Counter />, container);
  });

  const button = container.querySelector("button");
  const label = container.querySelector("p");

  // needs to be wrapped in act to ensure useEffect runs before assertion is checked:
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(label.textContent).toBe("You clicked 1 times");
  expect(document.title).toBe("You clicked 1 times");
});

test("this test passes because the click is wrapped in act, which ensures effects are run before the assertions", () => {
  // https://dev.to/dmtrkovalenko/how-act-works-inside-react-3hc0
  act(() => {
    ReactDOM.render(<Counter />, container);
  });

  const button = container.querySelector("button");
  const label = container.querySelector("p");

  // act will block the next line of code (ie the assertions) from running until the useEffect runs and updates document.title
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(label.textContent).toBe("You clicked 1 times");
  expect(document.title).toBe("You clicked 1 times");
});

test("just use react testing library, which automatically wraps everything with act", () => {
  /* 
    https://testing-library.com/docs/preact-testing-library/api/#act
    "All renders and events being fired are wrapped in act, so you don't really need this. 
    It's responsible for flushing all effects and rerenders after invoking it."
    
    more info:
    https://twitter.com/kentcdodds/status/1330937800321974272?lang=en
    https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning
    https://javascript.plainenglish.io/you-probably-dont-need-act-in-your-react-tests-2a0bcd2ad65c
    https://davidwcai.medium.com/react-testing-library-and-the-not-wrapped-in-act-errors-491a5629193b
  */
  render(<Counter />);

  const button = screen.getByText("Click me");
  const label = screen.getByTestId("count");

  expect(label.textContent).toBe("You clicked 0 times");
  expect(document.title).toBe("You clicked 0 times");

  userEvent.click(button);
  expect(label.textContent).toBe("You clicked 1 times");
  expect(document.title).toBe("You clicked 1 times");
});

test("this will give the annoying act warning even though we are using react-testing-library", () => {
  render(<Names />);

  const button = screen.getByText("Load names");
  userEvent.click(button);

  /*
    "Whenever a state update is scheduled asynchronously (e.g. after a promise resolves), 
    the test can no longer stay synchronous. Otherwise, React will warn us that 
    state updates are not wrapped in act()"
    https://javascript.plainenglish.io/you-probably-dont-need-act-in-your-react-tests-2a0bcd2ad65c
  */

  // pretend these are legit assertions:
  expect(true).toBe(true);
});

test("fix the act warning by using react-testing-library async utils", async () => {
  render(<Names />);

  const button = screen.getByText("Load names");
  userEvent.click(button);

  await waitFor(() => {
    expect(screen.getByText("jill")).toBeTruthy();
  });

  // would also work:
  // expect(await screen.findByText("jill")).toBeTruthy();
});
