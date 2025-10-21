import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import { supabase } from "@/integrations/supabase/client";

const fetchTotalPrintCost = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("cost")
    .eq("user_id", userId)
    .eq("status", "success")
    .not("cost", "is", null);

  if (error) {
    if (error.code === 'PGRST116') return 0;
    throw new Error(error.message);
  }

  if (!data) return 0;

  return data.reduce((sum, job) => sum + (job.cost || 0), 0);
};

export const useTotalPrintCost = () => {
  const { user } = useSession();
  const userId = user?.id;

  const { data: totalCost, isLoading, isError } = useQuery<number>({
    queryKey: ["totalPrintCost", userId],
    queryFn: () => fetchTotalPrintCost(userId!),
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
  });

  const formattedCost = totalCost !== undefined ? `£${totalCost.toFixed(2)}` : "N/A";

  return {
    totalPrintCost: formattedCost,
    isLoading,
    isError,
  };
};