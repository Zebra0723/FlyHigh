import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Component, ReactNode } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Rankings from "@/pages/Rankings";
import Planes from "@/pages/Planes";
import PlaneProfile from "@/pages/PlaneProfile";
import Tutorials from "@/pages/Tutorials";
import Admin from "@/pages/Admin";
import SubmitDesign from "@/pages/SubmitDesign";
import Gallery from "@/pages/Gallery";
import MyTable from "@/pages/MyTable";
import Profile from "@/pages/Profile";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <p className="font-display font-800 text-foreground mb-2">Something went wrong</p>
          <p className="text-xs text-muted-foreground mb-4">{this.state.error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-700">Reload</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) return <AuthPage />;

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={() => <Layout><Home /></Layout>} />
        <Route path="/rankings" component={() => <Layout><Rankings /></Layout>} />
        <Route path="/my-table" component={() => <Layout><MyTable /></Layout>} />
        <Route path="/planes" component={() => <Layout><Planes /></Layout>} />
        <Route path="/planes/:slug" component={() => <Layout><PlaneProfile /></Layout>} />
        <Route path="/tutorials" component={() => <Layout><Tutorials /></Layout>} />
        <Route path="/submit" component={() => <Layout><SubmitDesign /></Layout>} />
        <Route path="/gallery" component={() => <Layout><Gallery /></Layout>} />
        <Route path="/profile" component={() => <Layout><Profile /></Layout>} />
        <Route path="/admin" component={Admin} />
        <Route component={() => <Layout><NotFound /></Layout>} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppRoutes />
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
