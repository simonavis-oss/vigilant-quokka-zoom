import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession && window.location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        } else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          if (window.location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        } else if (event === "AUTH_ERROR") {
          showError("Authentication error occurred.");
        }
        setIsLoading(false);
      },
    );

    // Fetch initial session manually in case onAuthStateChange misses it (common in SSR/CSR transitions)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session && window.location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return context;
};