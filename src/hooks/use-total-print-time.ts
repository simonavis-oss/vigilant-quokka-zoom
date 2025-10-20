import { useQuery } from "@tanstack/react-query";

// Mock function to simulate fetching total print time from a backend service
const fetchTotalPrintTime = async (): Promise<number> => {
  // Simulate a large number of seconds (e.g., 1500 hours)
  const totalSeconds = 1500 * 3600 + Math.floor(Math.random() * 3600); 
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return totalSeconds;
};

const formatTime = (totalSeconds: number): string => {
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
  const { data: totalSeconds, isLoading, isError } = useQuery<number>({
    queryKey: ["totalPrintTime"],
    queryFn: fetchTotalPrintTime,
    staleTime: 60000, // Cache for 1 minute
  });

  const formattedTime = totalSeconds !== undefined ? formatTime(totalSeconds) : "N/A";

  return {
    totalPrintTime: formattedTime,
    isLoading,
    isError,
  };
};