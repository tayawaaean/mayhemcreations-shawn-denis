import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { customerApiService } from '../shared/customerApiService';

/**
 * VerifyEmail Component
 * 
 * Handles email verification for user accounts. This component:
 * - Extracts verification token from URL parameters
 * - Sends verification request to backend
 * - Displays success/error states with appropriate actions
 * - Provides resend verification functionality
 * - Redirects users to home page after successful verification
 * 
 * @component
 * @returns {JSX.Element} The email verification page
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [token]);

  /**
   * Verifies email address using the provided token
   * @param verificationToken - The verification token from the email link
   */
  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await customerApiService.verifyEmail(verificationToken);
      
      if (response.success) {
        setVerificationStatus('success');
        setMessage('Email verified successfully! You can now login using the login button on the home page.');
        
        // Redirect to home after 3 seconds (login modal will be available there)
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setMessage(response.message || 'Email verification failed');
      }
    } catch (error: any) {
      setVerificationStatus('error');
      setMessage(error.message || 'An error occurred during verification');
    }
  };

  /**
   * Handles resending verification email
   * Extracts email from URL parameters and sends resend request
   */
  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const response = await customerApiService.resendVerificationEmail(searchParams.get('email') || '');
      
      if (response.success) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage(response.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Navigates user to the home page
   * Used after successful verification or as fallback action
   */
  const handleGoToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {verificationStatus === 'loading' && (
              <>
                <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Verifying Email...
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {verificationStatus === 'success' && (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Email Verified!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleGoToHome}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Home & Login
                  </button>
                </div>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <XCircle className="mx-auto h-12 w-12 text-red-600" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Verification Failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                  <button
                    onClick={handleGoToHome}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Home
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
