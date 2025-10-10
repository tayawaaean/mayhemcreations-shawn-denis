import { Router } from 'express';
import { ShipStationController } from '../controllers/shipStationController';
import { ShipStationWebhookController } from '../controllers/shipStationWebhookController';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation middleware
const testConnectionValidation: any[] = [];
const getCarriersValidation: any[] = [];
const getRatesValidation = [
  body('carrierCode').notEmpty().withMessage('Carrier code is required'),
  body('fromPostalCode').notEmpty().withMessage('From postal code is required'),
  body('toState').notEmpty().withMessage('To state is required'),
  body('toCountry').notEmpty().withMessage('To country is required'),
  body('toPostalCode').notEmpty().withMessage('To postal code is required'),
  body('weight.value').isNumeric().withMessage('Weight value must be numeric'),
  body('weight.units').isIn(['pounds', 'ounces', 'grams', 'kilograms']).withMessage('Invalid weight units'),
];
const createLabelValidation = [
  body('carrierCode').notEmpty().withMessage('Carrier code is required'),
  body('serviceCode').notEmpty().withMessage('Service code is required'),
  body('packageCode').notEmpty().withMessage('Package code is required'),
  body('shipDate').isISO8601().withMessage('Ship date must be valid date'),
  body('weight.value').isNumeric().withMessage('Weight value must be numeric'),
  body('weight.units').isIn(['pounds', 'ounces', 'grams', 'kilograms']).withMessage('Invalid weight units'),
  body('shipFrom.name').notEmpty().withMessage('Ship from name is required'),
  body('shipFrom.street1').notEmpty().withMessage('Ship from street1 is required'),
  body('shipFrom.city').notEmpty().withMessage('Ship from city is required'),
  body('shipFrom.state').notEmpty().withMessage('Ship from state is required'),
  body('shipFrom.postalCode').notEmpty().withMessage('Ship from postal code is required'),
  body('shipFrom.country').notEmpty().withMessage('Ship from country is required'),
  body('shipTo.name').notEmpty().withMessage('Ship to name is required'),
  body('shipTo.street1').notEmpty().withMessage('Ship to street1 is required'),
  body('shipTo.city').notEmpty().withMessage('Ship to city is required'),
  body('shipTo.state').notEmpty().withMessage('Ship to state is required'),
  body('shipTo.postalCode').notEmpty().withMessage('Ship to postal code is required'),
  body('shipTo.country').notEmpty().withMessage('Ship to country is required'),
];
const getShipmentValidation = [
  param('shipmentId').notEmpty().withMessage('Shipment ID is required'),
];
const getTrackingValidation = [
  param('trackingNumber').notEmpty().withMessage('Tracking number is required'),
];
const createOrderValidation = [
  body('orderNumber').notEmpty().withMessage('Order number is required'),
  body('orderDate').isISO8601().withMessage('Order date must be valid date'),
  body('orderStatus').isIn(['awaiting_payment', 'awaiting_shipment', 'shipped', 'on_hold', 'cancelled']).withMessage('Invalid order status'),
  body('billTo.name').notEmpty().withMessage('Bill to name is required'),
  body('billTo.street1').notEmpty().withMessage('Bill to street1 is required'),
  body('billTo.city').notEmpty().withMessage('Bill to city is required'),
  body('billTo.state').notEmpty().withMessage('Bill to state is required'),
  body('billTo.postalCode').notEmpty().withMessage('Bill to postal code is required'),
  body('billTo.country').notEmpty().withMessage('Bill to country is required'),
  body('shipTo.name').notEmpty().withMessage('Ship to name is required'),
  body('shipTo.street1').notEmpty().withMessage('Ship to street1 is required'),
  body('shipTo.city').notEmpty().withMessage('Ship to city is required'),
  body('shipTo.state').notEmpty().withMessage('Ship to state is required'),
  body('shipTo.postalCode').notEmpty().withMessage('Ship to postal code is required'),
  body('shipTo.country').notEmpty().withMessage('Ship to country is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
  body('items.*.unitPrice').isNumeric().withMessage('Item unit price must be numeric'),
];
const getOrdersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 500 }).withMessage('Page size must be between 1 and 500'),
  query('sortBy').optional().isIn(['orderDate', 'modifyDate', 'orderNumber']).withMessage('Invalid sort field'),
  query('sortDir').optional().isIn(['ASC', 'DESC']).withMessage('Sort direction must be ASC or DESC'),
];
const updateOrderStatusValidation = [
  param('orderId').notEmpty().withMessage('Order ID is required'),
  body('status').notEmpty().withMessage('Status is required'),
];
const getWarehousesValidation: any[] = [];
const getStoresValidation: any[] = [];

// Admin-only routes (require admin or manager role)
router.get('/test-connection', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  testConnectionValidation, 
  ShipStationController.testConnection
);

router.get('/carriers', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getCarriersValidation, 
  ShipStationController.getCarriers
);

router.post('/rates', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getRatesValidation, 
  ShipStationController.getRates
);

router.post('/labels', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  createLabelValidation, 
  ShipStationController.createLabel
);

router.get('/shipments/:shipmentId', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getShipmentValidation, 
  ShipStationController.getShipment
);

router.get('/tracking/:trackingNumber', 
  hybridAuthenticate, 
  getTrackingValidation, 
  ShipStationController.getTracking
);

router.post('/orders', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  createOrderValidation, 
  ShipStationController.createOrder
);

router.get('/orders', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getOrdersValidation, 
  ShipStationController.getOrders
);

router.put('/orders/:orderId/status', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  updateOrderStatusValidation, 
  ShipStationController.updateOrderStatus
);

router.get('/warehouses', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getWarehousesValidation, 
  ShipStationController.getWarehouses
);

router.get('/stores', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getStoresValidation, 
  ShipStationController.getStores
);

// Webhook routes (no authentication required - ShipStation will call these directly)
router.post('/webhooks/order-update', ShipStationWebhookController.handleOrderUpdate);
router.post('/webhooks/shipment-update', ShipStationWebhookController.handleShipmentUpdate);

export default router;
