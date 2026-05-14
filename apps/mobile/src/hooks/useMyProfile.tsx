import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@jam-app/convex";

export function useMyProfile() {
  const profile = useQuery(api.profiles.getMe);

  return {
    profile,
    isLoading: profile === undefined,
  };
}

export function useCreateProfile() {
  const createProfile = useMutation(api.profiles.createProfile);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (variables: { displayName: string; username: string }) => {
    setIsPending(true);
    try {
      return await createProfile(variables);
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutateAsync,
  };
}
