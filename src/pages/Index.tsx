import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/context/SessionContext";

const Index = () => {
  const { user } = useSession();
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">
        Welcome, {user?.email || "User"}!
      </h1>
      <p className="text-muted-foreground">
        This is your 3D Print Farm Dashboard. Start by adding a printer.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Printers Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No printers connected yet.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Prints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Ready to start printing.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="p-8 border rounded-lg bg-card">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <p>We have set up the foundation: Authentication, User Profiles, and Dark/Light Theme support.</p>
        <p className="mt-2">The next major step is defining the **Printer Data Model** and implementing the **Connection Wizard**.</p>
      </div>
    </div>
  );
};

export default Index;