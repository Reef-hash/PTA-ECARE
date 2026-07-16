import React, { useState, useEffect } from 'react';
import { X, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface CompleteProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (profileData: { ic_number: string; contact_no: string; contact_no_2: string; address: string; }) => void;
    isLoading?: boolean;
    isMandatory?: boolean;
}

export default function CompleteProfileModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
    isMandatory = false
}: CompleteProfileModalProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        ic_number: '',
        contact_no: '',
        contact_no_2: '',
        address: '',
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                ic_number: '',
                contact_no: '',
                contact_no_2: '',
                address: '',
            });
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading && !isMandatory) onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, isLoading]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.ic_number || !formData.contact_no || !formData.contact_no_2 || !formData.address) {
            toast.error(t('user_auth.fill_required') || 'Sila isi semua maklumat wajib');
            return;
        }

        if (formData.ic_number.length !== 12) {
            toast.error(t('user_auth.ic_length') || 'No IC mesti 12 digit tanpa -');
            return;
        }

        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-gray-100 dark:border-gray-700 animate-fade-in">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Lengkapkan Profil
                        </h3>
                    </div>
                    {!isMandatory && (
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Untuk menyempurnakan pendaftaran Google anda, sila lengkapkan maklumat wajib di bawah.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('user_dashboard.label_ic') || 'No. Kad Pengenalan'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.ic_number}
                            onChange={(e) => setFormData({ ...formData, ic_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                            placeholder="901234567890"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            maxLength={12}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('user_dashboard.label_phone1') || 'No Telefon'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.contact_no}
                            onChange={(e) => setFormData({ ...formData, contact_no: e.target.value.replace(/\D/g, '') })}
                            placeholder="0123456789"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            No Telefon 2 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.contact_no_2}
                            onChange={(e) => setFormData({ ...formData, contact_no_2: e.target.value.replace(/\D/g, '') })}
                            placeholder="Jika tiada, masukkan No Telefon 1"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-400 mt-1">Jika tiada nombor kedua, masukkan nombor telefon yang sama.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('user_dashboard.label_address') || 'Alamat'} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Alamat penuh"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none dark:bg-gray-700 dark:text-white"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        {!isMandatory && (
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-70 transition-colors flex justify-center items-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : null}
                            Teruskan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
