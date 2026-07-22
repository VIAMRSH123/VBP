import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { TopBarLayout } from "./layouts/TopBarLayout";
import { LoginPage } from "./pages/LoginPage";
import { TFSDashboardPage } from "./pages/TFSDashboardPage";
import { LeadManagementPage } from "./pages/LeadManagementPage";
import { LeadDetailPage } from "./pages/LeadDetailPage";
import { SalesRepresentativePage } from "./pages/SalesRepresentativePage";
import { SalesManagerPage } from "./pages/SalesManagerPage";
import { MarketingAnalyticsPage } from "./pages/MarketingAnalyticsPage";
import { NotificationCenterPage } from "./pages/NotificationCenterPage";
import { OperationsDashboardPage } from "./pages/OperationsDashboardPage";
import { AdministrationPage } from "./pages/AdministrationPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<TopBarLayout />}>
          {/* Open to every authenticated role — each tab scopes itself to the
              current user (sales reps are locked to their own data server-side). */}
          <Route index element={<TFSDashboardPage />} />

          <Route path="/leads" element={<LeadManagementPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />

          <Route
            element={<ProtectedRoute allowedRoles={["administrator", "sales_manager", "sales_representative"]} />}
          >
            <Route path="/my-leads" element={<SalesRepresentativePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["administrator", "sales_manager"]} />}>
            <Route path="/team" element={<SalesManagerPage />} />
          </Route>

          <Route
            element={<ProtectedRoute allowedRoles={["administrator", "sales_manager", "executive"]} />}
          >
            <Route path="/marketing" element={<MarketingAnalyticsPage />} />
            <Route path="/operations" element={<OperationsDashboardPage />} />
          </Route>

          <Route path="/notifications" element={<NotificationCenterPage />} />

          <Route element={<ProtectedRoute allowedRoles={["administrator"]} />}>
            <Route path="/admin" element={<AdministrationPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
