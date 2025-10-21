import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SessionContextProvider } from "./context/SessionContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import MainLayout from "./layouts/MainLayout";
import PrinterDetails from "./pages/PrinterDetails";
import ProfilePage from "./pages/Profile";
import PrintQueuePage from "./pages/PrintQueue";
import PrintersPage from "./pages/Printers";
import FailureAlertsPage from "./pages/FailureAlertsPage";
import MaterialsPage from "./pages/MaterialsPage"; // Import new page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" attribute="class" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Protected Routes wrapped in MainLayout */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/printers" element={<PrintersPage />} />
                <Route path="/printers/:id" element={<PrinterDetails />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/queue" element={<PrintQueuePage />} />
                <Route path="/alerts" element={<FailureAlertsPage />} />
                <Route path="/materials" element={<MaterialsPage />} /> {/* New Route */}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;