import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { setAuthToken } from "../lib/axios";

export const AuthSync = ({ children }: { children: React.ReactNode }) => {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!isLoaded) return;
      if (isSignedIn) {
        const token = await getToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
      setReady(true);
    };
    sync();
  }, [isSignedIn, isLoaded]);

  if (!ready) return null;

  return <>{children}</>;
};
