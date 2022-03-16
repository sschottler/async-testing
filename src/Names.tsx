import { useState } from "react";
import { fetchNames } from "./services";

export const Names = () => {
  const [names, setNames] = useState<string[]>([]);

  const handleClick = () => {
    fetchNames().then((result) => setNames(result));
  };

  return (
    <div>
      <button onClick={handleClick}>Load names</button>
      <ul data-testid="names-list">
        {names.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ul>
    </div>
  );
};
