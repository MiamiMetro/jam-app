import { create } from "zustand";

interface ProfileState {
  isProfileReady: boolean;
  needsUsernameSetup: boolean;
  setProfileReady: (ready: boolean) => void;
  setNeedsUsernameSetup: (needs: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isProfileReady: false,
  needsUsernameSetup: false,
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  setNeedsUsernameSetup: (needs) => set({ needsUsernameSetup: needs }),
}));
