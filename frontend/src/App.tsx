import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Error Page
import ErrorPage from './components/ErrorPage';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Public pages (no auth required)
import PublicComplaint from './pages/public/PublicComplaint';

// User pages
import UserLogin from './pages/users/UserLogin';
import UserRegister from './pages/users/UserRegister';
import GoogleCompleteProfile from './pages/users/GoogleCompleteProfile';
import AuthCallback from './pages/users/AuthCallback';
import ForgotPassword from './pages/users/ForgotPassword';
import UserDashboard from './pages/users/UserDashboard';
import RegisterComplaint from './pages/users/RegisterComplaint';
import ComplaintHistory from './pages/users/ComplaintHistory';
import UserComplaintDetail from './pages/users/UserComplaintDetail';
import UserProfile from './pages/users/UserProfile';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AllComplaints from './pages/admin/AllComplaints';
import AdminComplaintDetail from './pages/admin/AdminComplaintDetail';
import TrackRepair from './pages/admin/TrackRepair';
import Technicians from './pages/admin/Technicians';
import TechnicianForm from './pages/admin/TechnicianForm';
import TechnicianDetail from './pages/admin/TechnicianDetail';
import Users from './pages/admin/Users';
import UserDetails from './pages/admin/UserDetails';
import Categories from './pages/admin/Categories';
import Subcategories from './pages/admin/Subcategories';
import Brands from './pages/admin/Brands';
import States from './pages/admin/States';
import PrintReceipt from './pages/admin/PrintReceipt';
import SettingsPage from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
import DebugAuth from './pages/DebugAuth';
import AdminMainTechQueue from './pages/admin/AdminMainTechQueue';
import RepairDetail from './pages/repair/RepairDetail';

// Technician pages
import TechDashboard from './pages/technician/TechDashboard';
import TechComplaints from './pages/technician/TechComplaints';
import TechComplaintDetail from './pages/technician/TechComplaintDetail';

// Main Tech pages
import MainTechDashboard from './pages/main_technician/MainTechDashboard';
import MainTechComplaints from './pages/main_technician/MainTechComplaints';
import SearchComplaint from './pages/main_technician/SearchComplaint';

// Shared pages
import NotificationsPage from './pages/NotificationsPage';

// Loading component
function LoadingScreen() {
    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
    );
}

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
    const { isAuthenticated, role, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        if (allowedRoles.includes('admin') || allowedRoles.includes('technician')) {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/users" replace />;
    }

    if (role && !allowedRoles.includes(role)) {
        if (role === 'user') {
            return <Navigate to="/users/dashboard" replace />;
        }
        if (role === 'admin') {
            return <Navigate to="/admin/dashboard" replace />;
        }
        if (role === 'technician') {
            return <Navigate to="/admin/technician/dashboard" replace />;
        }
        if (role === 'main_technician') {
            return <Navigate to="/main-tech/dashboard" replace />;
        }
    }

    return <>{children}</>;
}

function App() {
    return (
        <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Complaint Route (no auth required) */}
            <Route path="/complaint" element={<PublicComplaint />} />

            {/* Error Page */}
            <Route path="/error" element={<ErrorPage />} />

            {/* User Routes */}
            <Route path="/users" element={<UserLogin />} />
            <Route path="/users/login" element={<UserLogin />} />
            <Route path="/users/register" element={<UserRegister />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/lengkapkan-profil" element={<GoogleCompleteProfile />} />
            <Route path="/users/complete-profile" element={<GoogleCompleteProfile />} />
            <Route path="/users/forgot-password" element={<ForgotPassword />} />
            <Route
                path="/users/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <UserDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users/register-complaint"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <RegisterComplaint />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users/complaint-history"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <ComplaintHistory />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users/complaint/:id"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <UserComplaintDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users/complaint/:id/track-repair"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <TrackRepair />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users/profile"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <UserProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users/notifications"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <NotificationsPage />
                    </ProtectedRoute>
                }
            />

            {/* Debug Route */}
            <Route path="/debug-auth" element={<DebugAuth />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
                path="/admin/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/all-complaints"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="all" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/not-processed"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="pending" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/in-progress"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="in_process" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/not-forwarded"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="not_forwarded" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/job-assigned"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="job_assigned" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/closed"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="closed" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/cancelled"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="cancelled" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/incomplete-bawa-pulang"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AllComplaints status="incomplete" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/complaint/:id"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminComplaintDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/complaint/:id/track-repair"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <TrackRepair />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/main-tech-queue"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminMainTechQueue />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/repair/:id"
                element={
                    <ProtectedRoute allowedRoles={['admin', 'technician']}>
                        <RepairDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/print/:id"
                element={
                    <ProtectedRoute allowedRoles={['admin', 'technician']}>
                        <PrintReceipt />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technicians"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Technicians />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technicians/add"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <TechnicianForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technicians/edit/:id"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <TechnicianForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technicians/:id"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <TechnicianDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Users />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users/:id"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <UserDetails />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/categories"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Categories />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/subcategories"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Subcategories />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/brands"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Brands />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/states"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <States />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/settings"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <SettingsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/profile"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/notifications"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <NotificationsPage />
                    </ProtectedRoute>
                }
            />

            {/* Technician Routes */}
            <Route path="/admin/technician" element={<AdminLogin />} />
            <Route
                path="/admin/technician/profile"
                element={
                    <ProtectedRoute allowedRoles={['technician']}>
                        <AdminProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technician/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['technician']}>
                        <TechDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technician/complaints"
                element={
                    <ProtectedRoute allowedRoles={['technician']}>
                        <TechComplaints />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technician/notifications"
                element={
                    <ProtectedRoute allowedRoles={['technician']}>
                        <NotificationsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technician/complaint/:id"
                element={
                    <ProtectedRoute allowedRoles={['technician']}>
                        <TechComplaintDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/technician/complaint/:id/track-repair"
                element={
                    <ProtectedRoute allowedRoles={['technician']}>
                        <TrackRepair />
                    </ProtectedRoute>
                }
            />

            {/* Main Technician Routes */}
            <Route path="/main-tech" element={<AdminLogin />} />
            <Route
                path="/main-tech/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <MainTechDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/main-tech/complaints"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <MainTechComplaints />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/main-tech/search"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <SearchComplaint />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/main-tech/profile"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <AdminProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/main-tech/notifications"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <NotificationsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/main-tech/complaint/:id"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <AdminComplaintDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/main-tech/complaint/:id/track-repair"
                element={
                    <ProtectedRoute allowedRoles={['main_technician']}>
                        <TrackRepair />
                    </ProtectedRoute>
                }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
