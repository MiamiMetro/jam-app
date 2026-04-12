import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useMyProfile() {
  const profile = useQuery(api.profiles.getMe);

  return {
    profile,
    isLoading: profile === undefined,
  };
}
