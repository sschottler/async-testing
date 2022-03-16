import { useState, useEffect, useLayoutEffect } from "react";

export const Counter = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount((value) => value + 1);
  };

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });
  // this would run sync instead of async like useEffect:
  // useLayoutEffect(() => {
  //   document.title = `You clicked ${count} times`;
  // });

  return (
    <div>
      <p data-testid="count">You clicked {count} times</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};
