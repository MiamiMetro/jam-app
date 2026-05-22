// SearchInput.tsx — Debounced real-time search input with glass styling
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  className?: string;
  debounceMs?: number;
}

export function SearchInput({
  placeholder = "Search...",
  value = "",
  onSearch,
  className = "mb-4",
  debounceMs = 300,
}: SearchInputProps) {
  const [input, setInput] = useState(value);
  const searchTimeoutRef = useRef<number | null>(null);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const updateSearch = (nextValue: string) => {
    setInput(nextValue);
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      onSearchRef.current(nextValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setInput("");
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    onSearchRef.current("");
  };

  return (
    <div className={className}>
      <div className="relative group/search glass-strong rounded-lg focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary pointer-events-none transition-colors" />
        <Input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => updateSearch(e.target.value)}
          className="pl-10 pr-8 border-0 bg-transparent shadow-none focus:ring-0"
        />
        {input && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
