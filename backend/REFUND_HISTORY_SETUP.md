# Refund History Tracking Setup

This guide explains how to set up the refund request history table using Sequelize ORM.

## Overview

The refund history tracking system maintains a complete audit trail of all refund-related actions:
- Customer submits refund request
- Admin reviews and approves/rejects
- Status changes tracked over time
- Abuse detection and prevention

## Model Structure

**File**: `src/models/refundRequestHistoryModel.ts`

The `RefundRequestHistory` model tracks:
- Refund request ID and related entities (user, order)
- Action taken (created, approved, rejected, cancelled, etc.)
- Previous and new status
- Admin information and notes
- Rejection reasons
- Request details (amount, type, reason)
- Metadata for abuse tracking (IP, user agent)

## Setup Instructions

### Option 1: Run the Sync Script (Recommended)

The easiest way to create the table is to run the sync script:

```bash
cd backend
npx ts-node src/scripts/syncRefundHistoryTable.ts
```

This will:
- ✅ Create the `refund_request_history` table if it doesn't exist
- ✅ Modify the table structure to match the model (alter mode)
- ✅ Create all necessary indexes
- ✅ Verify the table was created successfully
- ✅ Display useful query examples

### Option 2: Add to Server Initialization

You can also sync the model when your server starts by adding it to your initialization code:

```typescript
// In src/server.ts or src/app.ts

import { RefundRequestHistory } from './models/refundRequestHistoryModel';

// During server initialization
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Sync RefundRequestHistory table
    await RefundRequestHistory.sync({ alter: true });
    console.log('✅ Refund history table synced');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}
```

### Option 3: Sync All Models

If you want to sync all models at once:

```bash
cd backend
npx ts-node -e "
  import('./src/config/database').then(({ sequelize }) => {
    sequelize.sync({ alter: true }).then(() => {
      console.log('All tables synced');
      process.exit(0);
    });
  });
"
```

## Usage Examples

### 1. Log Refund History (Automatic)

History is automatically logged by the `RefundService` when actions occur:

```typescript
// In RefundService.rejectRefund()
await this.logRefundHistory({
  refundRequestId: refund.id,
  userId: refund.userId,
  orderId: refund.orderId,
  orderNumber: refund.orderNumber,
  action: 'rejected',
  previousStatus: 'pending',
  newStatus: 'rejected',
  rejectionReason: 'Item not damaged',
  refundAmount: 49.99,
  refundType: 'full',
  reason: 'damaged_defective',
  description: 'Customer claimed damage'
});
```

### 2. Get Refund History

```typescript
// Get complete history for a refund request
const history = await RefundService.getRefundHistory(refundRequestId);

// Displays all actions taken on this refund
history.forEach(entry => {
  console.log(`${entry.action} at ${entry.createdAt}`);
  if (entry.rejectionReason) {
    console.log(`Reason: ${entry.rejectionReason}`);
  }
});
```

### 3. Check for Abuse Patterns

```typescript
// Check if user has suspicious refund pattern
const abuseCheck = await RefundService.checkForRefundAbuse(userId);

if (abuseCheck.isSuspicious) {
  console.log('⚠️ Suspicious pattern detected!');
  console.log(abuseCheck.reason);
  console.log('Stats:', abuseCheck.stats);
  
  // Admin could be notified or additional verification required
}
```

### 4. Get User Rejection Statistics

```typescript
// Get rejection stats for a user
const stats = await RefundService.getUserRejectionCount(userId);

console.log(`Total refund attempts: ${stats.totalAttempts}`);
console.log(`Rejected: ${stats.rejectionCount}`);
console.log(`Rejection rate: ${stats.rejectionRate}%`);
```

## Database Queries

### Get All History for a Refund Request

```sql
SELECT * FROM refund_request_history 
WHERE refund_request_id = ?
ORDER BY created_at DESC;
```

### Find Users with Multiple Rejections

```sql
SELECT 
  user_id,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN action = 'rejected' THEN 1 ELSE 0 END) as rejection_count,
  ROUND(
    (SUM(CASE WHEN action = 'rejected' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
    2
  ) as rejection_rate
FROM refund_request_history
WHERE action IN ('created', 'rejected', 'approved')
GROUP BY user_id
HAVING rejection_count >= 2
ORDER BY rejection_count DESC, rejection_rate DESC;
```

### Get Rejection History for an Order

```sql
SELECT 
  h.*,
  u.email as user_email,
  u.first_name,
  u.last_name
FROM refund_request_history h
LEFT JOIN users u ON h.user_id = u.id
WHERE h.order_id = ?
ORDER BY h.created_at DESC;
```

## Indexes

The model automatically creates these indexes for performance:
- `idx_refund_request_id` - Fast lookup by refund request
- `idx_user_id` - Fast lookup by user
- `idx_order_id` - Fast lookup by order
- `idx_action` - Fast filtering by action type
- `idx_created_at` - Fast time-based queries

## Abuse Detection Rules

The system flags users as suspicious if:
1. **3 or more rejected refund requests**, OR
2. **50% or higher rejection rate** with at least 2 rejections

These thresholds can be adjusted in `RefundService.checkForRefundAbuse()`.

## Integration with Existing Features

### Automatic Logging on Rejection

When an admin rejects a refund (`RefundService.rejectRefund()`):
1. ✅ Refund status updated
2. ✅ History entry created automatically
3. ✅ Email notification sent
4. ✅ WebSocket notification sent
5. ✅ Payment log updated

### Frontend Display

The rejection history powers these UI features:
- Rejection reason display in MyOrders page
- "Refund Declined" badge
- Ability to resubmit after rejection
- Customer alert notifications

## Troubleshooting

### Table Already Exists Error

If you get a "table already exists" error:
```bash
# Use alter mode to modify existing table
npx ts-node -e "
  import('./src/models/refundRequestHistoryModel').then(({ RefundRequestHistory }) => {
    RefundRequestHistory.sync({ alter: true }).then(() => {
      console.log('Table updated');
      process.exit(0);
    });
  });
"
```

### Missing Indexes

Indexes are created automatically during sync. To verify:
```sql
SHOW INDEXES FROM refund_request_history;
```

### Data Not Being Logged

Check the logs for errors:
```bash
# Backend logs
tail -f backend/logs/combined.log | grep "refund history"
```

Common causes:
- Table not created yet
- Foreign key constraints failing
- Database connection issues

## Best Practices

1. **Always log history** - Even for minor status changes
2. **Include context** - Add admin notes for clarity
3. **Review patterns** - Regularly check abuse detection
4. **Clean old data** - Archive history older than 2 years
5. **Monitor performance** - Ensure indexes are being used

## Maintenance

### Archive Old History

```sql
-- Archive history older than 2 years
INSERT INTO refund_request_history_archive
SELECT * FROM refund_request_history
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);

DELETE FROM refund_request_history
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

### Generate Reports

```sql
-- Monthly rejection report
SELECT 
  DATE_FORMAT(created_at, '%Y-%m') as month,
  COUNT(*) as total_rejections,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(refund_amount) as avg_refund_amount
FROM refund_request_history
WHERE action = 'rejected'
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC;
```

## Support

For issues or questions:
1. Check backend logs: `backend/logs/error.log`
2. Verify table structure: `DESCRIBE refund_request_history`
3. Test query performance: `EXPLAIN SELECT ...`
4. Review Sequelize logs (set `logging: console.log` in config)

---

**Note**: The SQL migration file (`create-refund-history-table.sql`) has been replaced by this Sequelize model approach for better integration with the ORM and automatic schema management.





