import { useEffect, useRef, useState } from "react";

interface AutocompleteProps<T> {
  placeholder: string;
  onSearch: (query: string) => T[];
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  disabled?: boolean;
  minChars?: number;
}

export function Autocomplete<T>({
  placeholder,
  onSearch,
  onSelect,
  renderItem,
  getKey,
  disabled,
  minChars = 2,
}: AutocompleteProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    window.clearTimeout(debounceRef.current);
    if (value.trim().length < minChars) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      const found = onSearch(value);
      setResults(found);
      setOpen(found.length > 0);
    }, 120);
  }

  function pick(item: T) {
    onSelect(item);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        pick(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="autocomplete" ref={containerRef}>
      <input
        type="text"
        className="autocomplete-input"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim().length >= minChars && results.length > 0 && setOpen(true)}
      />
      {open && (
        <ul className="autocomplete-list" role="listbox">
          {results.map((item, i) => (
            <li
              key={getKey(item)}
              role="option"
              aria-selected={i === activeIndex}
              className={"autocomplete-item" + (i === activeIndex ? " active" : "")}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
