import ReactDOM from "react-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Counter } from "./Counter";
import { Names } from "./Names";
import { TodoList } from "./TodoList";
import { SearchResults } from "./SearchResults";

jest.mock("./services", () => ({
  fetchTodos: async () => [
    { title: "first todo", completed: false, id: 1 },
    { title: "second todo", completed: true, id: 2 },
    { title: "third todo", completed: true, id: 3 },
  ],
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

  const label = container.querySelector("p");

  expect(label.textContent).toBe("You clicked 0 times");
  // this will fail because the useEffect that sets document.title runs async after the render
  // https://reactjs.org/docs/hooks-reference.html#timing-of-effects
  // side note: it would pass if we used useLayoutEffect instead of useEffect to set the document title, because useLayoutEffect runs sync
  expect(document.title).toBe("You clicked 0 times");
});

test("this test will pass because it is using act, which ensures the useEffect will run before the assertion", () => {
  // act blocks until react updates dom and runs effects (https://reactjs.org/docs/testing-recipes.html#act)
  // more info: https://github.com/threepointone/react-act-examples/blob/master/sync.md
  act(() => {
    ReactDOM.render(<Counter />, container);
  });

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

test("this test will fail because sync act will not await the fetchTodos promise", () => {
  act(() => {
    ReactDOM.render(<TodoList />, container);
  });

  // fetchTodos promise has not resolved yet:
  expect(screen.getByText("first todo")).toBeTruthy();
});

test("this test will pass because it uses the asynchronous version of act to apply resolved promises", async () => {
  // wait for fetchTodos promise to resolve with async act:
  await act(async () => {
    ReactDOM.render(<TodoList />, container);
  });

  // fetchTodos promise has resolved so it's okay to verify our expectations:
  expect(screen.getByText("first todo")).toBeTruthy();
});

test("this test will fail because async act only awaits microtasks, but not macrotasks (setTimeout, etc.)", async () => {
  // if a component sets state in macrotask (such as setTimeout), async act won't wait long enough
  // why would a component do that? It can help the screen feel more responsive
  // because the browser has an opportunity to update dom between macrotasks
  // See my startTransition talk for a deeper dive into what causes jank, etc.
  await act(async () => {
    ReactDOM.render(<SearchResults />, container);
  });

  const input = container.querySelector("input");
  await act(async () => {
    // typing in the input will trigger a state change in a scheduled macrotask (setTimeout(() => setState(results), 0))
    // meaning it will run in next tick of the event loop and we need to await that
    userEvent.type(input, "search term");
  });

  // this data will not appear until the next tick of the event loop, but we try to assert it during the current tick:
  const firstResult = "result 1 for search term";
  expect(screen.getByText(firstResult)).toBeTruthy();
});

test("this test will pass because we wait 1 tick of the event loop before our assertions", async () => {
  ReactDOM.render(<SearchResults />, container);

  const input = container.querySelector("input");
  userEvent.type(input, "search term");

  // this line blocks until next tick of the event loop:
  await new Promise((resolve) => setTimeout(resolve));

  const firstResult = "result 1 for search term";
  expect(screen.getByText(firstResult)).toBeTruthy();
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

test("this will still give the annoying act warning even though we are using react-testing-library", () => {
  render(<Names />);

  const button = screen.getByText("Load names");
  userEvent.click(button);

  /*
    "Whenever a state update is scheduled asynchronously (e.g. after a promise resolves), 
    the test can no longer stay synchronous. Otherwise, React will warn us that 
    state updates are not wrapped in act()"
    https://javascript.plainenglish.io/you-probably-dont-need-act-in-your-react-tests-2a0bcd2ad65c

    This error is thrown when React detects jest is defined globally and your state update is not wrapped in act
    React philosopy is "UI = function(state)" so if state changes, it assumes UI likely changed and if your test 
    triggered that change, then you should probably wait for it and assert rather than fire and forget. Otherwise
    your test is sort of arranging and acting, but only partially asserting

    pseudo code for act helper and why promise resolutions run outside of it: https://jsfiddle.net/8Lj9wxsh/

    If you get this error, you're probably triggering a promise inside a useEffect or click that sets state 
    when it resolves and you are not using RTL's async utils to await the UI change that results from that state change
  */

  // pretend these are legit assertions:
  expect(true).toBe(true);
});

test("You could make the warning go away by mixing RTL with async act to await promise resolutions", async () => {
  render(<Names />);

  const button = screen.getByText("Load names");
  // you should see "Avoid wrapping Testing Library util calls in `act`"
  // https://github.com/testing-library/eslint-plugin-testing-library/blob/main/docs/rules/no-unnecessary-act.md
  // https://kentcdodds.com/blog/common-mistakes-with-react-testing-library#wrapping-things-in-act-unnecessarily
  await act(async () => {
    userEvent.click(button);
  });

  // pretend these are legit assertions:
  expect(true).toBe(true);
});

test("fix the act warning by using react-testing-library async utils", async () => {
  render(<Names />);

  const button = screen.getByText("Load names");
  userEvent.click(button);

  // wait for the UI update triggered by async state setter
  // waitFor automatically wraps with act to ensure effects are flushed, etc.
  await waitFor(() => {
    expect(screen.getByText("jill")).toBeTruthy();
  });

  // would also work:
  // expect(await screen.findByText("jill")).toBeTruthy();
});

test("RTL async utils test from user perspective and don't care about technical implementation details of microtasks/macrotasks/etc.", async () => {
  render(<SearchResults />);

  const input = screen.getByTestId("search-input");
  userEvent.type(input, "search term");

  // don't need bullshit like this:
  // await new Promise((resolve) => setTimeout(resolve));
  // often it won't even be obvious where the async code is
  // it could be inside a thunk that is dispatched by another thunk and results in
  // redux store updating and new props flowing into component and rerender...
  // it could be in a 3rd party component's source that schedules the state update in a setTimeout
  // (maybe an autocomplete or data visualization with sophisticated batching & scheduling logic to keep screen responsive)
  // this is why you wanna be able to test from a user perspective without knowledge of implementation details
  // "I know some data appears after a bit. I don't care how or why"

  const firstResult = "result 1 for search term";
  await waitFor(() => {
    expect(screen.getByText(firstResult)).toBeTruthy();
  });

  // would also work:
  // expect(await screen.findByText(firstResult)).toBeTruthy();
});
