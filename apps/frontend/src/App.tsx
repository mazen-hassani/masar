// ABOUTME: Main React App component - router and layout container
// ABOUTME: Initializes React Query and handles overall app state

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { routes } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    },
  },
});

function AppRoutes() {
  const element = useRoutes(routes);
  return element;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
