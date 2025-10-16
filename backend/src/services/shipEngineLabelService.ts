// ShipEngine Label Creation Service
// Handles creating shipping labels via ShipEngine API after payment

import axios from 'axios'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/database'

// Interface for label request parameters
interface LabelRequest {
  orderId: number
  rateId?: string  // Optional: If you already have a rate from checkout
}

// Interface for label response data
interface LabelResponse {
  labelId: string
  trackingNumber: string
  labelDownloadPdf: string
  labelDownloadPng: string
  carrierCode: string
  serviceCode: string
  shipmentCost: number
}

export class ShipEngineLabelService {
  private apiKey: string
  private baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.shipengine.com/v1' 
    : 'https://api.shipengine.com/v1'  // Use production URL for both environments

  constructor() {
    // Load ShipEngine API key from environment variables
    // Support both SHIPENGINE_API_KEY and SHIPSTATION_API_KEY (they're the same)
    this.apiKey = process.env.SHIPENGINE_API_KEY || process.env.SHIPSTATION_API_KEY || ''
    
    if (!this.apiKey) {
      console.error('❌ ShipEngine API key not found!')
      console.error('Please set SHIPENGINE_API_KEY or SHIPSTATION_API_KEY in your .env file')
      console.error('Get your API key from: https://www.shipengine.com/')
    } else {
      console.log('✅ ShipEngine API key loaded:', this.apiKey.substring(0, 20) + '...')
    }
  }

  /**
   * Create a shipping label from an existing rate (fastest method)
   * Use this when you already have a rate ID from checkout
   */
  async createLabelFromRate(rateId: string, orderId: number): Promise<LabelResponse> {
    try {
      console.log(`📦 Creating label from rate ${rateId} for order ${orderId}`)
      
      // Fetch order details for metadata
      const [order] = await sequelize.query(
        'SELECT * FROM order_reviews WHERE id = ?',
        {
          replacements: [orderId],
          type: QueryTypes.SELECT
        }
      ) as any[]
      
      if (!order) {
        throw new Error('Order not found')
      }

      // Generate custom label messages
      const labelMessages = this.generateLabelMessages(order)

      // Create label from rate ID via ShipEngine API
      const response = await axios.post(
        `${this.baseUrl}/labels/rates/${rateId}`,
        {
          // Add custom messages to the label
          label_messages: labelMessages,
          
          // Request inline download for immediate PDF access
          label_download_type: 'inline',
          
          // Label format and layout
          label_format: 'pdf',
          label_layout: '4x6'  // Standard 4x6 inch shipping label
        },
        {
          headers: {
            'API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      const label = response.data

      console.log(`✅ Label created successfully: ${label.label_id}`)
      console.log(`📍 Tracking number: ${label.tracking_number}`)
      console.log('🔍 Full ShipEngine response structure:', JSON.stringify(label, null, 2))
      console.log('🔍 Label download structure:', JSON.stringify(label.label_download, null, 2))
      
      // Handle different possible label download structures from ShipEngine
      let pdfUrl = null
      let pngUrl = null
      
      if (label.label_download) {
        // Try different possible field names for PDF
        pdfUrl = label.label_download.pdf || 
                 label.label_download.href || 
                 label.label_download.url ||
                 null
        
        // Try different possible field names for PNG
        pngUrl = label.label_download.png || null
        
        console.log('🔍 Extracted URLs:', { pdfUrl, pngUrl })
      } else {
        console.warn('⚠️ No label_download object in response!')
      }

      return {
        labelId: label.label_id,
        trackingNumber: label.tracking_number,
        labelDownloadPdf: pdfUrl,
        labelDownloadPng: pngUrl,
        carrierCode: label.carrier_code,
        serviceCode: label.service_code,
        shipmentCost: label.shipment_cost?.amount || 0
      }
    } catch (error: any) {
      console.error('❌ ShipEngine Label Creation Error:', error.response?.data || error.message)
      throw new Error(`Failed to create shipping label: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a shipping label from scratch (use when no rate exists)
   * This creates a new shipment and generates a label in one step
   */
  async createLabelFromShipment(orderId: number): Promise<LabelResponse> {
    try {
      console.log(`📦 Creating label from shipment for order ${orderId}`)
      
      // Fetch order with shipping details
      const [order] = await sequelize.query(
        'SELECT * FROM order_reviews WHERE id = ?',
        {
          replacements: [orderId],
          type: QueryTypes.SELECT
        }
      ) as any[]
      
      if (!order) {
        throw new Error('Order not found')
      }

      // Parse order data to get shipping address and items
      let orderData
      try {
        orderData = typeof order.order_data === 'string' 
          ? JSON.parse(order.order_data) 
          : order.order_data
      } catch (error) {
        console.error('Error parsing order_data:', error)
        throw new Error('Invalid order data format')
      }

      console.log('📋 Order data structure:', {
        hasItems: !!orderData?.items,
        hasShippingAddress: !!orderData?.shippingAddress,
        hasOrderShippingAddress: !!order.shipping_address,
        keys: Object.keys(orderData || {}),
        isArray: Array.isArray(orderData)
      })

      // Get items - could be in orderData.items or directly as an array
      let items
      if (Array.isArray(orderData)) {
        // Order data is directly an array of items
        items = orderData
      } else if (orderData?.items) {
        // Order data is an object with items property
        items = orderData.items
      } else {
        items = []
      }
      
      // Get shipping address - prioritize order table's shipping_address field
      let shippingAddress = order.shipping_address
      
      // If not in order table, try to parse from order_data
      if (!shippingAddress && orderData?.shippingAddress) {
        shippingAddress = orderData.shippingAddress
      }
      
      // If shipping_address is a string, parse it
      if (typeof shippingAddress === 'string') {
        try {
          shippingAddress = JSON.parse(shippingAddress)
        } catch (e) {
          console.error('Failed to parse shipping_address string:', e)
        }
      }

      // Get shipping method from order (includes carrier and service)
      let shippingMethod = order.shipping_method
      if (typeof shippingMethod === 'string') {
        try {
          shippingMethod = JSON.parse(shippingMethod)
        } catch (e) {
          console.error('Failed to parse shipping_method:', e)
          shippingMethod = null
        }
      }

      console.log('📦 Extracted data:', {
        itemsCount: items?.length || 0,
        hasShippingAddress: !!shippingAddress,
        addressFields: shippingAddress ? Object.keys(shippingAddress) : [],
        hasShippingMethod: !!shippingMethod,
        shippingMethod: shippingMethod
      })

      // Debug: Log the actual shipping address data
      if (shippingAddress) {
        console.log('📍 Shipping Address Details:', {
          name: shippingAddress.name || `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          address: shippingAddress.address || shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone
        })
      }

      if (!shippingAddress) {
        console.error('Shipping address missing. Order:', {
          id: order.id,
          shipping_address: order.shipping_address,
          orderData: orderData
        })
        throw new Error('Shipping address not found in order. Please ensure the order has a valid shipping address.')
      }

      if (!items || items.length === 0) {
        console.error('No items found in order. Order data:', orderData)
        throw new Error('No items found in order')
      }

      // Generate custom label messages
      const labelMessages = this.generateLabelMessages(order)

      // Normalize country code - convert full country names to ISO codes
      // ShipEngine requires 2-letter ISO country codes (e.g., "US", "CA")
      const normalizeCountryCode = (country: string | undefined): string => {
        if (!country) return 'US'
        
        // If already a 2-letter code, return as-is
        if (country.length === 2) return country.toUpperCase()
        
        // Convert common country names to ISO codes
        const countryMap: { [key: string]: string } = {
          'United States': 'US',
          'United States of America': 'US',
          'USA': 'US',
          'Canada': 'CA',
          'Mexico': 'MX',
          'United Kingdom': 'GB',
          'Great Britain': 'GB',
          'UK': 'GB'
        }
        
        return countryMap[country] || 'US'
      }

      // Build shipment configuration
      const shipmentConfig: any = {
        // Ship From address (your warehouse/business address)
        ship_from: {
          name: 'Mayhem Creations',
          phone: '555-555-5555',
          company_name: 'Mayhem Creations',
          address_line1: '123 Business St',
          city_locality: 'Austin',
          state_province: 'TX',
          postal_code: '78701',
          country_code: 'US'
        },
        
        // Ship To address (customer address)
        ship_to: {
          name: shippingAddress.name || `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          phone: shippingAddress.phone || '',
          address_line1: shippingAddress.address || shippingAddress.street,
          address_line2: shippingAddress.address2 || shippingAddress.apartment || '',
          city_locality: shippingAddress.city,
          state_province: shippingAddress.state,
          postal_code: shippingAddress.zipCode,
          country_code: normalizeCountryCode(shippingAddress.country)
        },
        
        // Package details
        packages: [{
          weight: {
            value: this.calculateOrderWeight(items),
            unit: 'ounce'
          },
          dimensions: {
            unit: 'inch',
            length: 12,
            width: 9,
            height: 6
          },
          label_messages: labelMessages
        }]
      }

      // Add carrier and service from order's shipping method if available
      if (shippingMethod?.carrierId) {
        shipmentConfig.carrier_id = shippingMethod.carrierId
        console.log(`📮 Using carrier from order: ${shippingMethod.carrierId}`)
      } else if (process.env.SHIPENGINE_CARRIER_ID) {
        shipmentConfig.carrier_id = process.env.SHIPENGINE_CARRIER_ID
        console.log(`📮 Using carrier from env: ${process.env.SHIPENGINE_CARRIER_ID}`)
      }

      // Add service code from order's shipping method
      if (shippingMethod?.serviceCode) {
        shipmentConfig.service_code = shippingMethod.serviceCode
        console.log(`📮 Using service code from order: ${shippingMethod.serviceCode}`)
      } else if (shippingMethod?.service_code) {
        shipmentConfig.service_code = shippingMethod.service_code
        console.log(`📮 Using service_code from order: ${shippingMethod.service_code}`)
      } else if (orderData?.selectedShipping?.service_code) {
        shipmentConfig.service_code = orderData.selectedShipping.service_code
        console.log(`📮 Using service code from order data: ${orderData.selectedShipping.service_code}`)
      }

      // If we have neither carrier_id nor service_code, we can't create a label
      if (!shipmentConfig.carrier_id && !shipmentConfig.service_code) {
        throw new Error('Missing carrier or service information. Please ensure the order has valid shipping details from checkout.')
      }

      console.log('🚚 Final shipment config:', {
        carrier_id: shipmentConfig.carrier_id,
        service_code: shipmentConfig.service_code,
        from: `${shipmentConfig.ship_from.city_locality}, ${shipmentConfig.ship_from.state_province}`,
        to: `${shipmentConfig.ship_to.city_locality}, ${shipmentConfig.ship_to.state_province}`
      })

      // Debug: Log the exact ship_to address being sent to ShipEngine
      console.log('📮 ShipEngine ship_to address:', JSON.stringify(shipmentConfig.ship_to, null, 2))

      // Create label directly with shipment details
      const response = await axios.post(
        `${this.baseUrl}/labels`,
        {
          shipment: shipmentConfig,
          
          // Label options
          label_format: 'pdf',
          label_layout: '4x6',
          label_download_type: 'inline'
        },
        {
          headers: {
            'API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      const label = response.data

      console.log(`✅ Label created successfully: ${label.label_id}`)
      console.log(`📍 Tracking number: ${label.tracking_number}`)
      console.log(`🏷️ Label response data:`, {
        label_id: label.label_id,
        carrier_id: label.carrier_id,
        carrier_code: label.carrier_code,
        service_code: label.service_code,
        shipment_cost: label.shipment_cost?.amount
      })
      console.log('🔍 Full label object keys:', Object.keys(label))
      console.log('🔍 Label download structure:', JSON.stringify(label.label_download, null, 2))
      
      // Handle different possible label download structures from ShipEngine
      let pdfUrl = null
      let pngUrl = null
      
      if (label.label_download) {
        // Try different possible field names for PDF
        pdfUrl = label.label_download.pdf || 
                 label.label_download.href || 
                 label.label_download.url ||
                 null
        
        // Try different possible field names for PNG
        pngUrl = label.label_download.png || null
        
        console.log('🔍 Extracted URLs:', { pdfUrl, pngUrl })
      } else {
        console.warn('⚠️ No label_download object in response!')
      }

      return {
        labelId: label.label_id,
        trackingNumber: label.tracking_number,
        labelDownloadPdf: pdfUrl,
        labelDownloadPng: pngUrl,
        carrierCode: label.carrier_code,
        serviceCode: label.service_code,
        shipmentCost: label.shipment_cost?.amount || 0
      }
    } catch (error: any) {
      console.error('❌ ShipEngine Label Creation Error:', error.response?.data || error.message)
      throw new Error(`Failed to create shipping label: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Generate custom label messages based on order data
   * These messages appear on the physical shipping label
   */
  private generateLabelMessages(order: any): {
    reference1: string | null
    reference2: string | null
    reference3: string | null
  } {
    try {
      const orderData = typeof order.order_data === 'string' 
        ? JSON.parse(order.order_data)
        : order.order_data

      const items = orderData.items || []
      
      // Count embroidery items
      const embroideryItems = items.filter((item: any) => 
        item.customization?.designs?.length > 0
      )
      
      return {
        // Reference 1: Order number (always visible)
        reference1: order.order_number || `MC-${order.id}`,
        
        // Reference 2: Embroidery status
        reference2: embroideryItems.length > 0 
          ? `${embroideryItems.length} Embroidered Item${embroideryItems.length > 1 ? 's' : ''}`
          : `${items.length} Standard Item${items.length > 1 ? 's' : ''}`,
        
        // Reference 3: Customer name (helps with packing)
        reference3: orderData.shippingAddress?.name?.substring(0, 35) || null
      }
    } catch (error) {
      console.error('Error generating label messages:', error)
      // Return basic fallback messages
      return {
        reference1: order.order_number || `Order ${order.id}`,
        reference2: null,
        reference3: null
      }
    }
  }

  /**
   * Calculate total weight of order items
   * This is a simple estimation - adjust based on your actual product weights
   */
  private calculateOrderWeight(items: any[]): number {
    // Handle undefined or empty items
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items provided for weight calculation, using minimum weight')
      return 4 // Minimum weight: 4 oz
    }

    // Estimate: Each embroidered item weighs ~8 oz
    const totalWeight = items.reduce((sum, item) => {
      const quantity = item.quantity || 1
      const itemWeight = 8 // ounces per item (adjust based on your products)
      return sum + (quantity * itemWeight)
    }, 0)
    
    // Minimum weight: 4 oz (prevents carrier errors)
    return Math.max(totalWeight, 4)
  }

  /**
   * Save label information to database
   * Updates the order_review record with tracking and label data
   */
  async saveLabelToOrder(orderId: number, labelData: LabelResponse): Promise<void> {
    try {
      // Handle undefined values - use null for database
      const trackingNumber = labelData.trackingNumber || null
      const labelUrl = labelData.labelDownloadPdf || null
      const carrierCode = labelData.carrierCode || null
      const serviceCode = labelData.serviceCode || null

      console.log('💾 Saving label to database:', {
        orderId,
        trackingNumber,
        carrierCode,
        serviceCode,
        hasLabelUrl: !!labelUrl,
        labelUrlValue: labelUrl
      })

      // Save label information WITHOUT changing order status
      // Admin will manually mark as 'shipped' when package is actually handed to carrier
      await sequelize.query(
        `UPDATE order_reviews 
         SET tracking_number = ?,
             shipping_label_url = ?,
             carrier_code = ?,
             service_code = ?,
             updated_at = NOW()
         WHERE id = ?`,
        {
          replacements: [
            trackingNumber,
            labelUrl,
            carrierCode,
            serviceCode,
            orderId
          ],
          type: QueryTypes.UPDATE
        }
      )

      console.log(`✅ Label info saved to database for order ${orderId}`)
    } catch (error) {
      console.error('❌ Error saving label to database:', error)
      throw error
    }
  }
}

export const shipEngineLabelService = new ShipEngineLabelService()

