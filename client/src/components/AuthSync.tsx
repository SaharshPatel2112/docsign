import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { setAuthToken } from "../lib/axios";

export const AuthSync = ({ children }: { children: React.ReactNode }) => {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        const token = await getToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
    };
    syncToken();
  }, [isSignedIn]);

  return <>{children}</>;
};
