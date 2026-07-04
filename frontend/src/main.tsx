import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import './i18n'

import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <BrowserRouter>
                <AuthProvider>
                    <App />
                <Toaster
                    position="top-center"
                    toastOptions={{
                        duration: 4000,
                        className: 'font-sans',
                        style: {
                            background: 'rgba(255, 255, 255, 0.95)',
                            color: '#1f2937',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            padding: '16px',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#ecfdf5',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fef2f2',
                            },
                        },
                    }}
                />
            </AuthProvider>
            </BrowserRouter>
        </GoogleOAuthProvider>
    </React.StrictMode>,
)
