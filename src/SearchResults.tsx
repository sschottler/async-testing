import { useState } from "react";

function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const SearchResults = () => {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    // setTimeout was one approach before startTransition to keep input feeling responsive
    // https://blog.saeloun.com/2021/09/09/react-18-introduces-starttransition-api
    setTimeout(() => {
      if (val) {
        const length = getRandomNumber(2, 50);
        const fakeResults = Array.from({ length }).map(
          (_, i) => `result ${i + 1} for ${val}`
        );
        setResults(fakeResults);
      } else {
        setResults([]);
      }
    });
  };

  return (
    <div>
      <input
        data-testid="search-input"
        type="text"
        value={inputValue}
        onChange={handleChange}
      />
      <ul>
        {results.map((result, i) => (
          <li key={i}>{result}</li>
        ))}
      </ul>
    </div>
  );
};
