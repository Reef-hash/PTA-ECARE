import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Search,
    LogOut,
    Menu,
    X,
    User,
    Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface MainTechLayoutProps {
    children: ReactNode;
}

export default function MainTechLayout({ children }: MainTechLayoutProps) {
    const { logout, user } = useAuth();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const menuItems = [
        { path: '/main-tech/dashboard', label: 'Senarai Bawa Pulang', icon: LayoutDashboard },
        { path: '/main-tech/search', label: 'Semak Aduan (IC)', icon: Search },
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
                    <h1 className="text-sm font-bold truncate text-gray-800">MAIN TECH</h1>
                </div>
                
                <div className="flex items-center gap-2">
                    <LanguageSwitcher className="text-gray-600 flex-shrink-0 !px-1 !py-1 !text-xs" />
                    
                    {/* Mobile Profile Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0"
                        >
                            <User className="w-4 h-4" />
                        </button>

                        {showDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50 animate-fade-in">
                                <Link to="/main-tech/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    <Settings className="w-4 h-4 text-gray-400" />
                                    {t('common_actions.profile_settings')}
                                </Link>
                                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left">
                                    <LogOut className="w-4 h-4 text-red-400" />
                                    {t('common_actions.logout')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">MAIN TECH PANEL</p>
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

                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Desktop Header */}
                <header className="hidden lg:flex h-16 bg-white shadow-sm items-center justify-between px-8 sticky top-0 z-40 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Pengurusan Utama</h2>
                    <div className="flex items-center gap-6">
                        <LanguageSwitcher />
                        
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-colors"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-gray-900">{getUserName()}</p>
                                    <p className="text-xs text-gray-500">MAIN TECHNICIAN</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                            </button>

                            {showDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50 animate-fade-in">
                                    <Link to="/main-tech/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        <Settings className="w-4 h-4 text-gray-400" />
                                        {t('common_actions.profile_settings')}
                                    </Link>
                                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left">
                                        <LogOut className="w-4 h-4 text-red-400" />
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
