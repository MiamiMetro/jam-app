import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEnsureProfile } from "./hooks/useEnsureProfile";
import { useAuthStore } from "./stores/authStore";
import { useConvexAuth } from "./hooks/useConvexAuth";

export default function AuthSetup() {
  useConvexAuth();
  useEnsureProfile();

  const navigate = useNavigate();
  const checkSession = useAuthStore((state) => state.checkSession);
  const isGuest = useAuthStore((state) => state.isGuest);

  useEffect(() => {
    checkSession().catch(() => {
      // Store handles session failure by resetting auth state.
    });
  }, [checkSession]);

  useEffect(() => {
    if (!isGuest) {
      const returnPath = sessionStorage.getItem("auth_return_path");
      if (returnPath) {
        sessionStorage.removeItem("auth_return_path");
        navigate(returnPath, { replace: true });
      }
    }
  }, [isGuest, navigate]);

  return null;
}
