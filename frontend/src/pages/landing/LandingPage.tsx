import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoPta from '../../assets/images/logopta.png';
import logoEcare from '../../assets/images/logoe-care2.png';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function LandingPage() {
    const [isLoaded, setIsLoaded] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center text-center px-4 relative">
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm" />
            </div>

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeInUp 0.5s ease-out forwards;
                    opacity: 0;
                }
            `}</style>

            {/* Logo Section */}
            <div
                className={`flex items-center justify-center gap-4 mb-6 ${isLoaded ? 'animate-fade-in' : ''}`}
                style={{ animationDelay: '0.1s' }}
            >
                <img src={logoPta} alt="PTA Services Logo" className="w-24" />
                <img src={logoEcare} alt="e-care Logo" className="w-24" />
            </div>

            {/* Title Section */}
            <div
                className={`${isLoaded ? 'animate-fade-in' : ''}`}
                style={{ animationDelay: '0.2s' }}
            >
                <h1 className="text-4xl font-bold tracking-wide">PTA SERVICES</h1>
                <p className="text-lg mt-2 mb-8 opacity-90">{t('landing.subtitle')}</p>
            </div>

            {/* Buttons Section - Increased spacing to gap-6 (24px) */}
            <div className="w-full max-w-sm flex flex-col gap-6">

                <Link
                    to="/admin"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.3s' }}
                >
                    <i className="fa-solid fa-user-gear"></i>
                    {t('landing.admin_tech')}
                </Link>

                <Link
                    to="/users"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-blue-600 hover:bg-blue-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.35s' }}
                >
                    <i className="fa-solid fa-user"></i>
                    {t('landing.user')}
                </Link>

                <a
                    href="https://api.whatsapp.com/send?phone=601151134656&text=info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-green-600 hover:bg-green-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.4s' }}
                >
                    <i className="fa-brands fa-whatsapp"></i>
                    {t('landing.whatsapp')}
                </a>

                <Link
                    to="/complaint?type=kerosakan"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-red-600 hover:bg-red-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.5s' }}
                >
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    {t('landing.report_damage')}
                </Link>

                <Link
                    to="/complaint?type=aircond"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-teal-600 hover:bg-teal-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.6s' }}
                >
                    <i className="fa-solid fa-fan"></i>
                    {t('landing.service_aircond')}
                </Link>

                <Link
                    to="/complaint?type=cucian"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-purple-600 hover:bg-purple-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.7s' }}
                >
                    <i className="fa-solid fa-soap"></i>
                    {t('landing.service_cleaning')}
                </Link>

                <a
                    href="https://maps.app.goo.gl/TnQ4oZ3DENPqmTQ77"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`animate-fade-in flex items-center justify-center gap-3 border-2 border-white rounded-full py-4 font-semibold uppercase bg-orange-600 hover:bg-orange-500 transition-all duration-300 transform hover:scale-105 active:scale-95 ${isLoaded ? '' : 'opacity-0'}`}
                    style={{ animationDelay: '0.8s' }}
                >
                    <i className="fa-solid fa-location-dot"></i>
                    {t('landing.location')}
                </a>

            </div>

            <footer
                className={`mt-10 text-sm opacity-80 animate-fade-in ${isLoaded ? '' : 'opacity-0'}`}
                style={{ animationDelay: '1s' }}
            >
                © 2026 DFKTVETMARABESUT. All rights reserved.
            </footer>
        </div>
    );
}
