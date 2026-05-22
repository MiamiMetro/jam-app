// AuthModalRoot.tsx — Renders the active auth modal based on store state
import { useEffect } from "react";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";
import UsernameSetupModal from "@/components/auth/UsernameSetupModal";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";

export default function AuthModalRoot() {
  const { openUsernameSetup } = useAuthModalStore();
  const { needsUsernameSetup } = useProfileStore();
  const { isGuest } = useAuthStore();

  // Auto-open username setup when profile store says it's needed
  useEffect(() => {
    if (needsUsernameSetup && !isGuest) {
      openUsernameSetup();
    }
  }, [needsUsernameSetup, isGuest, openUsernameSetup]);

  return (
    <>
      <LoginModal />
      <SignupModal />
      <UsernameSetupModal />
    </>
  );
}
