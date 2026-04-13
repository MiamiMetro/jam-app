// UnifiedSearchBar.tsx — Global search bar with dropdown results for users & communities
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, User as UserIcon, Users as UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { getCommunityColors } from "@/lib/communityColors";
import type { User } from "@/lib/api/types";
import type { Community } from "@/hooks/useCommunities";

export function UnifiedSearchBar() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [debouncedInput] = useDebouncedValue(input, { wait: 300 });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { users, communities, isLoading, hasResults } = useUnifiedSearch(debouncedInput);
  const isDebouncing = input.trim() !== debouncedInput.trim();
  const showDropdown = isOpen && input.trim().length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  const handleSelect = useCallback(() => {
    setIsOpen(false);
    setInput("");
  }, []);

  const handleUserClick = useCallback(
    (user: User) => {
      handleSelect();
      navigate(`/profile/${user.username}`);
    },
    [handleSelect, navigate]
  );

  const handleCommunityClick = useCallback(
    (community: Community) => {
      handleSelect();
      navigate(`/community/${community.handle}`);
    },
    [handleSelect, navigate]
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-md" onKeyDown={handleKeyDown}>
      {/* Search Input */}
      <div className="relative group/search glass-strong rounded-lg focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary pointer-events-none transition-colors" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search users or communities..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (input.trim()) setIsOpen(true);
          }}
          className="pl-10 pr-8 border-0 bg-transparent shadow-none focus:ring-0"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl glass-strong border border-border/50 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {(isLoading || isDebouncing) ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {/* Users Section */}
              {users.length > 0 && (
                <div>
                  <div className="px-3 py-2 flex items-center gap-1.5 border-b border-border/30">
                    <UserIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Users
                    </span>
                  </div>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors cursor-pointer text-left"
                    >
                      <Avatar size="sm" className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || ""} alt={user.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{user.username}</div>
                        {user.display_name && user.display_name !== user.username && (
                          <div className="text-xs text-muted-foreground truncate">{user.display_name}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Communities Section */}
              {communities.length > 0 && (
                <div>
                  <div className={`px-3 py-2 flex items-center gap-1.5 border-b border-border/30 ${users.length > 0 ? "border-t border-t-border/30" : ""}`}>
                    <UsersIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Communities
                    </span>
                  </div>
                  {communities.map((community) => {
                    const colors = getCommunityColors(community.theme_color);
                    return (
                      <button
                        key={community.id}
                        onClick={() => handleCommunityClick(community)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors cursor-pointer text-left"
                      >
                        <Avatar size="sm" className={`h-8 w-8 flex-shrink-0 ring-1 ${colors.ring}`}>
                          <AvatarImage src={community.avatar_url ?? ""} alt={community.name} />
                          <AvatarFallback className={`${colors.avatarBg} ${colors.text} text-[10px] font-bold`}>
                            {community.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{community.name}</span>
                            <span className={`text-[11px] ${colors.text} shrink-0`}>#{community.handle}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {community.members_count} member{community.members_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
