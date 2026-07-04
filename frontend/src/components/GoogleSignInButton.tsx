import { GoogleLogin } from '@react-oauth/google';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleSignInButtonProps {
    onSuccess: (credential: string) => void;
    onError?: () => void;
    text?: GoogleButtonText;
    disabled?: boolean;
    disabledLabel: string;
    unavailableLabel: string;
    isConfigured?: boolean;
}

export default function GoogleSignInButton({
    onSuccess,
    onError,
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
        <div className="flex justify-center w-full">
            <GoogleLogin
                onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                        onSuccess(credentialResponse.credential);
                    } else if (onError) {
                        onError();
                    }
                }}
                onError={() => {
                    if (onError) onError();
                }}
                useOneTap={false}
                text={text}
                theme="outline"
                size="large"
                width="100%"
            />
        </div>
    );
}
