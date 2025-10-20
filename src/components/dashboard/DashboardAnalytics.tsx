import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintJob } from "@/types/print-job";
import { Printer } from "@/types/printer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { subDays, format, startOfDay, isSameDay } from "date-fns";
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import JobDetailsDialog from "./JobDetailsDialog";

interface DashboardAnalyticsProps {
  jobs: PrintJob[];
  printers: Printer[] | undefined;
}

const COLORS = {
  success: "#22c55e", // green-500
  failed: "#ef4444", // red-500
  cancelled: "#64748b", // slate-500
};

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  jobs,
  printers,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<PrintJob[]>([]);

  // Process data for jobs per day chart (last 7 days)
  const jobsPerDay = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, "MMM d"),
      fullDate: startOfDay(date),
      count: 0,
    };
  });

  jobs.forEach((job) => {
    if (job.started_at) {
      const jobDate = startOfDay(new Date(job.started_at));
      const dayData = jobsPerDay.find((d) => isSameDay(d.fullDate, jobDate));
      if (dayData) {
        dayData.count++;
      }
    }
  });

  // Process data for status breakdown chart
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<PrintJob["status"], number>);

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const handleBarClick = (data: any) => {
    if (!data || !data.activePayload) return;
    const payload = data.activePayload[0].payload;
    const clickedDate = payload.fullDate as Date;

    const filteredJobs = jobs.filter((job) => {
      if (!job.started_at) return false;
      return isSameDay(new Date(job.started_at), clickedDate);
    });

    setSelectedJobs(filteredJobs);
    setDialogTitle(`Print Jobs for ${format(clickedDate, "MMM d")}`);
    setIsDialogOpen(true);
  };

  const handlePieClick = (data: any) => {
    const clickedStatus = data.name.toLowerCase() as PrintJob["status"];

    const filteredJobs = jobs.filter((job) => job.status === clickedStatus);

    setSelectedJobs(filteredJobs);
    setDialogTitle(`Jobs with Status: ${data.name}`);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" /> Print Activity (Last 7
              Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobsPerDay} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" /> Job Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  onClick={handlePieClick}
                  className="cursor-pointer"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[
                          entry.name.toLowerCase() as keyof typeof COLORS
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <JobDetailsDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={dialogTitle}
        jobs={selectedJobs}
        printers={printers}
      />
    </>
  );
};

export default DashboardAnalytics;