import { useQuery } from "@tanstack/react-query";
import { fetchTotalPrintTime as fetchTotalPrintTimeFromApi } from "@/integrations/supabase/queries";
import { useSession } from "@/context/SessionContext";

const formatTime = (totalSeconds: number): string => {
  if (totalSeconds === 0) return "0m";
  
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
};

export const useTotalPrintTime = () => {
  const { user } = useSession();
  const userId = user?.id;

  const { data: totalSeconds, isLoading, isError } = useQuery<number>({
    queryKey: ["totalPrintTime", userId],
    queryFn: () => fetchTotalPrintTimeFromApi(userId!),
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
  });

  const formattedTime = totalSeconds !== undefined ? formatTime(totalSeconds) : "N/A";

  return {
    totalPrintTime: formattedTime,
    isLoading,
    isError,
  };
};