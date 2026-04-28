import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
} from 'react';
import { semanticStoreSearch } from '@/application/receiptScanner/semanticStoreSearch';
import { hasApiKey } from '@/services/settings/apiKey';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Store names sorted by frequency (most visited first). */
  storeHistory: string[];
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}

export default function StoreAutocomplete({
  value,
  onChange,
  storeHistory,
  disabled,
  hasError,
  autoFocus,
  placeholder = 'e.g. Carrefour',
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateSuggestions = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      // Fast path: simple substring match
      const lower = query.toLowerCase();
      const simple = storeHistory
        .filter((s) => s.toLowerCase().includes(lower))
        .slice(0, 6);

      if (simple.length > 0) {
        setSuggestions(simple);
        setIsOpen(true);
        return;
      }

      // Slow path: semantic search via Claude (debounced, needs API key)
      if (!hasApiKey()) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        setIsSearching(true);
        semanticStoreSearch(query, storeHistory)
          .then((results) => {
            setSuggestions(results.slice(0, 6));
            setIsOpen(results.length > 0);
          })
          .catch(() => {
            setSuggestions([]);
          })
          .finally(() => setIsSearching(false));
      }, 600);
    },
    [storeHistory]
  );

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    updateSuggestions(e.target.value);
  }

  function handleSelect(store: string) {
    onChange(store);
    setSuggestions([]);
    setIsOpen(false);
  }

  const base =
    'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 ' +
    'disabled:cursor-not-allowed disabled:bg-surface-elevated';
  const inputClass = `${base} ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-700 focus:border-brand focus:ring-brand/30'
  }`;

  return (
    <div ref={containerRef} className="relative">
      <input
        id="storeName"
        name="storeName"
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
        autoFocus={autoFocus}
        autoComplete="off"
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
      />
      {isSearching ? (
        <span
          aria-hidden="true"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-brand"
        />
      ) : null}
      {isOpen && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-700 bg-surface-elevated shadow-lg"
        >
          {suggestions.map((store) => (
            <li key={store} role="option" aria-selected={value === store}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-brand/20 focus:bg-brand/20 focus:outline-none"
                onMouseDown={() => handleSelect(store)}
              >
                {store}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
