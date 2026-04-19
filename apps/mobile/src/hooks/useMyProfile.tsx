import { useQuery } from "convex/react";
import { api } from "@jam-app/convex";

export function useMyProfile() {
  const profile = useQuery(api.profiles.getMe);

  return {
    profile,
    isLoading: profile === undefined,
  };
}
