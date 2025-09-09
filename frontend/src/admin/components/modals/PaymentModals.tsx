import React, { useState } from 'react'
import { X, CheckCircle, DollarSign, AlertTriangle, CreditCard } from 'lucide-react'
import { PaymentLog } from '../../types/paymentLogs'

interface PaymentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (paymentId: string) => void
  payment: PaymentLog | null
}

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  onRefund: (paymentId: string, refundAmount: number, reason: string) => void
  payment: PaymentLog | null
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  payment 
}) => {
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isOpen || !payment) return null

  const handleConfirm = async () => {
    setIsConfirming(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    onConfirm(payment.id)
    setIsConfirming(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">
                      Confirm Payment Processing
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      This will mark the payment as completed and update the order status to "Processing".
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">#{payment.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{payment.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-medium capitalize">{payment.provider.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-mono text-xs">{payment.transactionId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isConfirming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const RefundModal: React.FC<RefundModalProps> = ({ 
  isOpen, 
  onClose, 
  onRefund, 
  payment 
}) => {
  const [refundAmount, setRefundAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  React.useEffect(() => {
    if (payment) {
      setRefundAmount(payment.amount.toString())
    }
  }, [payment])

  if (!isOpen || !payment) return null

  const handleRefund = async () => {
    if (!refundAmount || !reason) return

    setIsProcessing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    onRefund(payment.id, parseFloat(refundAmount), reason)
    setIsProcessing(false)
  }

  const maxRefundAmount = payment.amount - (payment.refundAmount || 0)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Process Refund</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-orange-800">
                      Process Refund
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      This will refund the payment and update the order status to "Cancelled".
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">#{payment.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{payment.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Original Amount:</span>
                      <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    </div>
                    {payment.refundAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Already Refunded:</span>
                        <span className="font-medium text-red-600">${payment.refundAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Refund:</span>
                      <span className="font-medium text-green-600">${maxRefundAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxRefundAmount}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum refundable: ${maxRefundAmount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Reason *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a reason</option>
                    <option value="Customer requested">Customer requested</option>
                    <option value="Product defect">Product defect</option>
                    <option value="Wrong item shipped">Wrong item shipped</option>
                    <option value="Order cancelled">Order cancelled</option>
                    <option value="Duplicate payment">Duplicate payment</option>
                    <option value="Fraudulent transaction">Fraudulent transaction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {reason === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Please provide additional details..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundAmount || !reason || parseFloat(refundAmount) <= 0 || parseFloat(refundAmount) > maxRefundAmount || isProcessing}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
