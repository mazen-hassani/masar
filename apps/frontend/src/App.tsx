// ABOUTME: Main React App component - router and layout container
// ABOUTME: Initializes React Query and handles overall app state

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Task Management Tool
              </h1>
              <p className="text-sm text-gray-500">v0.1.0 - Development</p>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-6 px-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Welcome</h2>
              <p className="text-gray-600">
                Application is ready for development. Routes will be added in subsequent steps.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Frontend Status</h3>
                  <p className="text-sm text-green-600">✅ React setup complete</p>
                  <p className="text-sm text-green-600">✅ TypeScript configured</p>
                  <p className="text-sm text-green-600">✅ React Query ready</p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">API Status</h3>
                  <p className="text-sm text-blue-600">🔧 Configure database in Step 1.2</p>
                  <p className="text-sm text-blue-600">🔧 Setup auth in Step 1.4</p>
                  <p className="text-sm text-blue-600">🔧 Create routes in Phase 1</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
