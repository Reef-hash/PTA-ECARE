import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    FileText,
    Clock,
    AlertTriangle,
    Forward,
    CheckCircle,
    XCircle,
    Users,
    User,
    UserCog,
    FolderTree,
    Layers,
    Tag,
    MapPin,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ArrowLeft,
    UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
    breadcrumb?: string;
}

export default function AdminLayout({ children, breadcrumb }: AdminLayoutProps) {
    const { user, role, logout } = useAuth();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [complaintsOpen, setComplaintsOpen] = useState(false);
    const [masterOpen, setMasterOpen] = useState(false);

    const isTechnician = role === 'technician';

    const adminMenuItems = [
        { path: '/admin/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    ];

    const complaintItems = [
        { path: '/admin/all-complaints', label: t('sidebar.all_complaints'), icon: FileText },
        { path: '/admin/not-processed', label: t('sidebar.not_processed'), icon: Clock },
        { path: '/admin/in-progress', label: t('sidebar.in_process'), icon: AlertTriangle },
        { path: '/admin/not-forwarded', label: t('sidebar.not_forwarded'), icon: Forward },
        { path: '/admin/job-assigned', label: t('sidebar.job_assigned'), icon: UserCheck },
        { path: '/admin/closed', label: t('sidebar.closed'), icon: CheckCircle },
        { path: '/admin/cancelled', label: t('sidebar.cancelled'), icon: XCircle },
    ];

    const managementItems = [
        { path: '/admin/technicians', label: t('sidebar.technicians'), icon: UserCog },
        { path: '/admin/users', label: t('sidebar.users'), icon: Users },
        { path: '/admin/main-tech-queue', label: 'Main Tech Queue', icon: AlertTriangle },
    ];

    const masterItems = [
        { path: '/admin/categories', label: t('sidebar.ref_categories'), icon: FolderTree },
        { path: '/admin/subcategories', label: t('sidebar.ref_subcategories'), icon: Layers },
        { path: '/admin/brands', label: t('sidebar.ref_brands'), icon: Tag },
        { path: '/admin/states', label: t('sidebar.ref_locations'), icon: MapPin },
    ];

    const techMenuItems = [
        { path: '/admin/technician/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
        { path: '/admin/technician/complaints', label: t('sidebar.all_complaints'), icon: FileText },
    ];

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    const getUserName = () => {
        if (role === 'admin') return (user as any)?.admin_name || t('roles.admin');
        if (role === 'technician') return (user as any)?.name || t('roles.technician');
        return t('roles.user');
    };

    return (
        <div className="min-h-screen bg-gray-100 overflow-x-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden bg-dark-900 text-white p-3 flex items-center gap-2">
                <button onClick={() => setSidebarOpen(true)} className="p-1 flex-shrink-0">
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-sm font-bold truncate flex-1 min-w-0">E-CARE - {isTechnician ? 'TECHNICIAN' : 'ADMIN'}</h1>
                <LanguageSwitcher className="text-white flex-shrink-0 !px-1 !py-1 !text-xs" />
            </div>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-4 left-4 h-[calc(100vh-2rem)] w-64 bg-[#f8f9fa] rounded-2xl shadow-soft-xl z-50 overflow-y-auto [&::-webkit-scrollbar]:hidden transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:top-0 lg:left-0 lg:h-screen lg:rounded-none lg:shadow-none lg:bg-transparent ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-4">
                    {/* Close button (mobile) */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute top-4 right-4 p-2 lg:hidden text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Logo */}
                    <Link
                        to={isTechnician ? '/admin/technician/dashboard' : '/admin/dashboard'}
                        className="flex items-center gap-3 mb-8 px-2 mt-2 hover:opacity-80 transition-opacity"
                    >
                        <img src="/ecare-logo.png" alt="E-CARE Logo" className="w-12 h-12 rounded-full shadow-md" />
                        <div>
                            <h1 className="font-bold text-gray-800 text-lg">E-CARE</h1>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{isTechnician ? 'TECHNICIAN PANEL' : 'ADMIN PANEL'}</p>
                        </div>
                    </Link>


                    <hr className="h-px mt-0 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent mb-6" />

                    {/* Navigation */}
                    <nav className="space-y-1">
                        {isTechnician ? (
                            techMenuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${isActive
                                            ? 'bg-white shadow-soft-md text-gray-800'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-gradient-primary shadow-md text-white' : 'bg-white shadow-soft-md text-gray-800'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        {item.label}
                                    </Link>
                                );
                            })
                        ) : (
                            <>
                                {adminMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${isActive
                                                ? 'bg-white shadow-soft-md text-gray-800'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${isActive ? 'bg-gradient-primary shadow-md text-white' : 'bg-white shadow-soft-md text-gray-800'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            {item.label}
                                        </Link>
                                    );
                                })}

                                {/* Complaints submenu */}
                                <div className="mt-2">
                                    <button
                                        onClick={() => setComplaintsOpen(!complaintsOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white shadow-soft-md text-gray-800">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            {t('sidebar.complaints')}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${complaintsOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {complaintsOpen && (
                                        <div className="ml-4 pl-4 border-l border-gray-200 space-y-1 mt-1">
                                            {complaintItems.map((item) => {
                                                const isActive = location.pathname === item.path;
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setSidebarOpen(false)}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive
                                                            ? 'text-gray-900 font-semibold'
                                                            : 'text-gray-500 hover:text-gray-800'
                                                            }`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary-500' : 'bg-gray-400'}`}></span>
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Management */}
                                <div className="pt-4 mt-4">
                                    <p className="px-6 text-xs font-bold text-gray-400 uppercase mb-2">{t('sidebar.management')}</p>
                                    {managementItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${isActive
                                                    ? 'bg-white shadow-soft-md text-gray-800'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${isActive ? 'bg-gradient-primary shadow-md text-white' : 'bg-white shadow-soft-md text-gray-800'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Master data submenu */}
                                <div>
                                    <button
                                        onClick={() => setMasterOpen(!masterOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white shadow-soft-md text-gray-800">
                                                <Settings className="w-4 h-4" />
                                            </div>
                                            {t('sidebar.master_data')}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${masterOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {masterOpen && (
                                        <div className="ml-4 pl-4 border-l border-gray-200 space-y-1 mt-1">
                                            {masterItems.map((item) => {
                                                const isActive = location.pathname === item.path;
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setSidebarOpen(false)}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive
                                                            ? 'text-gray-900 font-semibold'
                                                            : 'text-gray-500 hover:text-gray-800'
                                                            }`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary-500' : 'bg-gray-400'}`}></span>
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* System */}
                                <div className="pt-4 mt-4">
                                    <p className="px-6 text-xs font-bold text-gray-400 uppercase mb-2">{t('sidebar.system')}</p>
                                    {[
                                        { path: '/admin/settings', label: t('sidebar.settings'), icon: Settings },
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${isActive
                                                    ? 'bg-white shadow-soft-md text-gray-800'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${isActive ? 'bg-gradient-primary shadow-md text-white' : 'bg-white shadow-soft-md text-gray-800'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 transition-all duration-300">
                {/* Header */}
                <header className="mx-2 sm:mx-6 mt-4 px-2 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                            title={t('common.back') || 'Back'}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        {breadcrumb && (
                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                                <span className="text-gray-400">Pages</span>
                                <span className="mx-1 sm:mx-2 text-gray-400">/</span>
                                <span className="font-medium text-gray-700">{breadcrumb}</span>
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        <LanguageSwitcher className="hidden sm:flex" />
                        <NotificationBell />

                        {/* User Profile - Top Right */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-semibold text-gray-700">{getUserName()}</p>
                                    <p className="text-xs text-gray-500">{isTechnician ? t('roles.technician') : t('roles.admin')}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                    {getUserName().charAt(0)}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 animate-fade-in z-50">
                                    <Link
                                        to={isTechnician ? "/admin/technician/profile" : "/admin/profile"}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowDropdown(false)}
                                    >
                                        <User className="w-4 h-4" />
                                        {isTechnician ? t('admin_profile.title_tech') : t('admin_profile.title')}
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {t('sidebar.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="p-3 sm:p-6 min-h-[calc(100vh-180px)]">{children}</div>

                {/* Footer */}
                <footer className="p-4 text-center text-sm text-gray-500">
                    © 2026 DFKTVETMARABESUT. All rights reserved.
                </footer>
            </main>
        </div>
    );
}
