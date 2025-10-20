import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/context/SessionContext";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "@/types/printer";
import { PrintJob } from "@/types/print-job";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarmStatus } from "@/hooks/use-farm-status";
import { useTotalPrintTime } from "@/hooks/use-total-print-time";
import {
  fetchPrinters,
  fetchAllPrintJobsForUser,
} from "@/integrations/supabase/queries";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";
import { Link } from "react-router-dom";

const Index = () => {
  const { user } = useSession();

  const { data: printers, isLoading: isPrintersLoading } = useQuery<Printer[]>(
    {
      queryKey: ["printers", user?.id],
      queryFn: () => fetchPrinters(user!.id),
      enabled: !!user?.id,
    },
  );

  const { data: allPrintJobs, isLoading: isJobsLoading } = useQuery<PrintJob[]>(
    {
      queryKey: ["allPrintJobs", user?.id],
      queryFn: () => fetchAllPrintJobsForUser(user!.id),
      enabled: !!user?.id,
    },
  );

  const {
    totalPrinters,
    onlineCount,
    activePrints,
    isLoading: isStatusLoading,
  } = useFarmStatus(printers);
  const { totalPrintTime, isLoading: isTimeLoading } = useTotalPrintTime();

  const isLoading =
    isPrintersLoading || isStatusLoading || isTimeLoading || isJobsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          An overview of your 3D print farm's activity and status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/printers">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Printers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isPrintersLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  totalPrinters
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalPrinters === 0
                  ? "No printers registered."
                  : `${onlineCount} online.`}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/printers">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Printers Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : onlineCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalPrinters > 0
                  ? `${totalPrinters - onlineCount} offline.`
                  : "Ready to connect."}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/queue">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Prints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : activePrints}
              </div>
              <p className="text-xs text-muted-foreground">
                {activePrints > 0
                  ? `${activePrints} prints running.`
                  : "Ready to start printing."}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Print Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isTimeLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                totalPrintTime
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accumulated time across all printers (Mocked)
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
      ) : allPrintJobs && allPrintJobs.length > 0 ? (
        <DashboardAnalytics jobs={allPrintJobs} printers={printers} />
      ) : (
        <div className="p-8 border rounded-lg bg-card text-center">
          <h2 className="text-xl font-semibold mb-4">No Print Data Yet</h2>
          <p className="text-muted-foreground">
            Once you complete some prints, analytics will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;