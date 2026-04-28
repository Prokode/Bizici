import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/AdminLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import UsersPage from "@/pages/Users";
import ShopsPage from "@/pages/Shops";
import ProductsPage from "@/pages/Products";
import CategoriesPage from "@/pages/Categories";
import ConversationsPage from "@/pages/Conversations";
import AdminsPage from "@/pages/Admins";
import InvitationsPage from "@/pages/Invitations";
import BroadcastsPage from "@/pages/Broadcasts";
import KarmaPage from "@/pages/Karma";
import ReviewsPage from "@/pages/Reviews";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

const baseRaw = import.meta.env.BASE_URL ?? "/";
const basePath = baseRaw.endsWith("/") && baseRaw !== "/"
  ? baseRaw.slice(0, -1)
  : baseRaw === "/"
    ? ""
    : baseRaw;

function ProtectedRoutes() {
  return (
    <RequireAuth>
      <AdminLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/shops" component={ShopsPage} />
          <Route path="/products" component={ProductsPage} />
          <Route path="/categories" component={CategoriesPage} />
          <Route path="/conversations" component={ConversationsPage} />
          <Route path="/conversations/:id" component={ConversationsPage} />
          <Route path="/admins" component={AdminsPage} />
          <Route path="/invitations" component={InvitationsPage} />
          <Route path="/broadcasts" component={BroadcastsPage} />
          <Route path="/karma" component={KarmaPage} />
          <Route path="/reviews" component={ReviewsPage} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router base={basePath}>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route component={ProtectedRoutes} />
            </Switch>
          </Router>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
