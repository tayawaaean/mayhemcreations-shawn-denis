/**
 * Stripe Payment Form Component
 * React component for Stripe card payment integration
 */

import React, { useEffect, useRef, useState } from 'react'
import { CreditCard, Lock, AlertCircle } from 'lucide-react'
import { stripeService, StripePaymentData } from '../shared/stripeService'
import { paymentConfig } from '../shared/paymentConfig'

interface StripePaymentFormProps {
  paymentData: StripePaymentData
  onSuccess: (result: any) => void
  onError: (error: any) => void
  disabled?: boolean
  className?: string
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  paymentData,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}) => {
  const cardElementRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize Stripe service
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [isInitialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (disabled || isLoading) return

    setIsLoading(true)
    setCardError(null)

    try {
      // Process payment directly (no card validation needed for simplified service)
      const result = await stripeService.processPayment(paymentData)
      
      if (result.success) {
        onSuccess(result)
      } else {
        setCardError(result.error || 'Payment failed')
        onError(new Error(result.error || 'Payment failed'))
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
      setCardError(errorMessage)
      onError(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!paymentConfig.isConfigured()) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <p className="text-red-600 text-sm">
          Stripe is not configured. Please check your API keys.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Information */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Payment Method
          </label>
          <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Credit/Debit Card</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Payment will be processed securely by Stripe
            </p>
            {cardError && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {cardError}
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
          <Lock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600">
            <p className="font-medium">Secure Payment</p>
            <p>Your payment information is encrypted and processed securely by Stripe.</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Amount</span>
            <span className="text-lg font-semibold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: paymentData.currency.toUpperCase()
              }).format(paymentData.amount / 100)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || isLoading || !isInitialized}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay with Card
            </>
          )}
        </button>

        {/* Stripe Branding */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by{' '}
            <span className="font-semibold text-blue-600">Stripe</span>
          </p>
        </div>
      </form>
    </div>
  )
}

export default StripePaymentForm
