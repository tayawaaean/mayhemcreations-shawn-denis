/**
 * PayPal Button Component
 * React component for PayPal payment button integration
 */

import React, { useEffect, useRef } from 'react'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { paymentConfig } from '../shared/paymentConfig'
import { paypalService, PayPalPaymentData } from '../shared/paypalService'

interface PayPalButtonProps {
  paymentData: PayPalPaymentData
  onSuccess: (result: any) => void
  onError: (error: any) => void
  onCancel: (data: any) => void
  disabled?: boolean
  style?: {
    layout?: 'vertical' | 'horizontal'
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black'
    shape?: 'rect' | 'pill'
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment'
    height?: number
  }
  className?: string
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  paymentData,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  style,
  className = ''
}) => {
  const paypalRef = useRef<HTMLDivElement>(null)

  const paypalConfig = paymentConfig.getPayPalConfig()

  const buttonStyle = {
    layout: 'vertical' as const,
    color: 'blue' as const,
    shape: 'rect' as const,
    label: 'paypal' as const,
    height: 50,
    ...style
  }

  const createOrder = async (data: any, actions: any) => {
    try {
      // Validate payment data
      const validation = paypalService.validatePaymentData(paymentData)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      // Create order via PayPal service
      const order = await paypalService.createOrder(paymentData)
      return order.id
    } catch (error) {
      console.error('Error creating PayPal order:', error)
      throw error
    }
  }

  const onApprove = async (data: any, actions: any) => {
    try {
      // Capture the payment
      const result = await paypalService.capturePayment(data.orderID, paymentData)
      
      if (result.success) {
        onSuccess(result)
      } else {
        onError(new Error(result.error || 'Payment failed'))
      }
    } catch (error) {
      console.error('Error capturing PayPal payment:', error)
      onError(error)
    }
  }

  const handleError = (err: any) => {
    console.error('PayPal payment error:', err)
    onError(err)
  }

  const handleCancel = (data: any) => {
    console.log('PayPal payment cancelled:', data)
    onCancel(data)
  }

  if (!paymentConfig.isConfigured()) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <p className="text-red-600 text-sm">
          PayPal is not configured. Please check your API keys.
        </p>
      </div>
    )
  }

  return (
    <div ref={paypalRef} className={className}>
      <PayPalScriptProvider
        options={{
          clientId: paypalConfig.clientId,
          currency: paymentData.currency,
          intent: 'capture',
          components: 'buttons',
          enableFunding: 'paylater,venmo,card',
          disableFunding: '',
          dataSdkIntegrationSource: 'integrationbuilder_ac'
        }}
      >
        <PayPalButtons
          createOrder={createOrder}
          onApprove={onApprove}
          onError={handleError}
          onCancel={handleCancel}
          style={buttonStyle}
          disabled={disabled}
          fundingSource="paypal"
        />
      </PayPalScriptProvider>
    </div>
  )
}

export default PayPalButton
