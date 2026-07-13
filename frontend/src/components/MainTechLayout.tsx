import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Search,
    LogOut,
    Menu,
    X,
    Settings,
    ChevronDown,
    ArrowLeft,
    Home
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

interface MainTechLayoutProps {
    children: ReactNode;
    breadcrumb?: string;
}

export default function MainTechLayout({ children, breadcrumb }: MainTechLayoutProps) {
    const { logout, user } = useAuth();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const menuItems = [
        { path: '/main-tech/dashboard', label: t('main_tech.layout.sidebar.dashboard'), icon: LayoutDashboard },
        { path: '/main-tech/search', label: t('main_tech.layout.sidebar.search'), icon: Search },
    ];

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    const getUserName = () => {
        const u = user as any;
        return u?.name || u?.username || u?.admin_name || u?.full_name || 'Main Technician';
    };

    return (
        <div className="min-h-screen bg-gray-100 overflow-x-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white border-b border-gray-200 p-3 flex items-center gap-2">
                <button onClick={() => setSidebarOpen(true)} className="p-1 flex-shrink-0 text-gray-600">
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-xs">
                        MT
                    </div>
                    <h1 className="text-sm font-bold truncate text-gray-800">{t('main_tech.layout.title')}</h1>
                </div>
                <LanguageSwitcher className="text-gray-600 flex-shrink-0 !px-1 !py-1 !text-xs" />
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
                <div className="p-4 flex flex-col min-h-full">
                    {/* Close button (mobile) */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute top-4 right-4 p-2 lg:hidden text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Logo */}
                    <Link
                        to="/main-tech/dashboard"
                        className="flex items-center gap-3 mb-8 px-2 mt-2 hover:opacity-80 transition-opacity"
                    >
                        <img src="/ecare-logo.png" alt="E-CARE Logo" className="w-12 h-12 rounded-full shadow-md" />
                        <div>
                            <h1 className="font-bold text-gray-800 text-lg">E-CARE</h1>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('main_tech.layout.title')}</p>
                        </div>
                    </Link>

                    <hr className="h-px mt-0 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent mb-6" />

                    {/* Navigation */}
                    <nav className="space-y-1 flex-1">
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

                    {/* Sidebar Footer - Logout */}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
                        >
                            <div className="p-2 rounded-lg bg-white shadow-soft-md text-red-600">
                                <LogOut className="w-4 h-4" />
                            </div>
                            {t('common_actions.logout')}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="mx-2 sm:mx-6 mt-4 px-2 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 bg-white/50 backdrop-blur-sm rounded-xl">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                            title={t('common.back') || 'Back'}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        {breadcrumb && (
                            <div className="flex items-center text-xs sm:text-sm text-gray-500 truncate">
                                <Link 
                                    to="/main-tech/dashboard" 
                                    className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center"
                                    title={t('main_tech.layout.sidebar.dashboard') || 'Dashboard'}
                                >
                                    <Home className="w-4 h-4" />
                                </Link>
                                <span className="mx-1 sm:mx-2 text-gray-400">/</span>
                                <span className="font-medium text-gray-700">{breadcrumb}</span>
                            </div>
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
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-gray-700">{getUserName()}</p>
                                    <p className="text-xs text-gray-500">MAIN TECHNICIAN</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                    {getUserName().charAt(0).toUpperCase()}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 animate-fade-in z-50">
                                    <Link to="/main-tech/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                        <Settings className="w-4 h-4" />
                                        {t('common_actions.profile_settings')}
                                    </Link>
                                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                                        <LogOut className="w-4 h-4" />
                                        {t('common_actions.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8">
                    {children}
                </main>
            </div>

            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
