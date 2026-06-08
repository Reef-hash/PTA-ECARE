type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleSignInButtonProps {
    onClick: () => void;
    text?: GoogleButtonText;
    disabled?: boolean;
    disabledLabel: string;
    unavailableLabel: string;
    isConfigured?: boolean;
}

const labels: Record<GoogleButtonText, string> = {
    signin_with: 'Sign in with Google',
    signup_with: 'Sign up with Google',
    continue_with: 'Continue with Google',
};

export default function GoogleSignInButton({
    onClick,
    text = 'continue_with',
    disabled = false,
    disabledLabel,
    unavailableLabel,
    isConfigured = true,
}: GoogleSignInButtonProps) {
    if (!isConfigured) {
        return (
            <button type="button" disabled className="w-full py-3 rounded-lg border border-gray-200 text-gray-400 bg-gray-50">
                {unavailableLabel}
            </button>
        );
    }

    if (disabled) {
        return (
            <button type="button" disabled className="w-full py-3 rounded-lg border border-gray-200 text-gray-400 bg-gray-50">
                {disabledLabel}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 font-medium shadow-sm"
        >
            <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-blue-600">
                G
            </span>
            {labels[text]}
        </button>
    );
}
