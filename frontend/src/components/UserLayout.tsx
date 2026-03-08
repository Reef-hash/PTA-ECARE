import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Home,
    FilePlus,
    History,
    User,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ArrowLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

interface UserLayoutProps {
    children: ReactNode;
    title?: string;
    breadcrumb?: string;
}

export default function UserLayout({ children, breadcrumb }: UserLayoutProps) {
    const { user, logout } = useAuth();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const menuItems = [
        { path: '/users/dashboard', label: t('user_sidebar.dashboard'), icon: Home },
        { path: '/users/register-complaint', label: t('user_sidebar.new_complaint'), icon: FilePlus },
        { path: '/users/complaint-history', label: t('user_sidebar.history'), icon: History },
        { path: '/users/profile', label: t('user_sidebar.profile'), icon: User },
    ];

    const handleLogout = () => {
        logout();
        navigate('/users');
    };

    return (
        <div className="min-h-screen bg-gray-100 overflow-x-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden bg-indigo-600 text-white p-4 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="p-2">
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold truncate">E-CARE - USER PORTAL</h1>
                <LanguageSwitcher className="text-white sm:hidden" />
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
                        to="/users/dashboard"
                        className="flex items-center gap-3 mb-8 px-2 mt-2 hover:opacity-80 transition-opacity"
                    >
                        <img src="/ecare-logo.png" alt="E-CARE Logo" className="w-12 h-12 rounded-full shadow-md" />
                        <div>
                            <h1 className="font-bold text-gray-800 text-lg">E-CARE</h1>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">USER PORTAL</p>
                        </div>
                    </Link>


                    <hr className="h-px mt-0 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent mb-6" />

                    {/* Navigation */}
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
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
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 transition-all duration-300">
                {/* Header */}
                <header className="mx-2 sm:mx-6 mt-4 px-3 sm:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title={t('common.back') || 'Back'}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        {breadcrumb && (
                            <p className="text-sm text-gray-500">
                                <span className="text-gray-400">Pages</span>
                                <span className="mx-2 text-gray-400">/</span>
                                <span className="font-medium text-gray-700">{breadcrumb}</span>
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <LanguageSwitcher className="hidden sm:flex" />
                        <NotificationBell />

                        {/* User Profile - Top Right */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-semibold text-gray-700">{(user as any)?.full_name || 'User'}</p>
                                    <p className="text-xs text-gray-500">{t('user_sidebar.user_role')}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                    {(user as any)?.full_name?.charAt(0) || 'U'}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 animate-fade-in z-50">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {t('user_sidebar.logout')}
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
