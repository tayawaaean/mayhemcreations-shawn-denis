import React, { useState, useEffect } from 'react'
import { materialCostApiService } from '../../shared/materialCostApiService'

export default function MaterialCostsTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testApiCall = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('=== Starting Material Cost API Test ===')
      
      const response = await materialCostApiService.getMaterialCosts()
      console.log('=== API Response ===', response)
      
      setResult(response)
    } catch (err) {
      console.error('=== API Error ===', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testDirectFetch = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('=== Starting Direct Fetch Test ===')
      
      const response = await fetch('http://localhost:5001/api/v1/material-costs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      const data = await response.json()
      console.log('=== Direct Fetch Response ===', { status: response.status, data })
      
      setResult({ success: response.ok, data, status: response.status })
    } catch (err) {
      console.error('=== Direct Fetch Error ===', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Material Costs API Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testApiCall}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API Service'}
        </button>
        
        <button
          onClick={testDirectFetch}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Direct Fetch'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-400 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

