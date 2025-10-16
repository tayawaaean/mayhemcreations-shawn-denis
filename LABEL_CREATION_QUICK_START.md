# 📦 Shipping Label Creation - Quick Start

## ✅ Feature Integrated!

Your admin panel now has **one-click shipping label creation** directly in the Orders section!

---

## 🚀 Quick Setup (3 Steps)

### **1. Run Database Migration**

```powershell
cd backend
psql -U postgres -d mayhem_creations -f src/scripts/add-label-fields.sql
```

### **2. Add Environment Variables**

Add to `backend/.env`:
```env
SHIPENGINE_API_KEY=test_your_key_here
SHIPENGINE_CARRIER_ID=se-123456
```

### **3. Restart Backend**

```powershell
cd backend
npm run dev
```

---

## 📍 Where to Use It

**Admin Panel → Pending Review → View Details**

You'll see:
- **Green "Create Label" button** (when order is approved)
- **Purple "Download Label" button** (after label is created)

---

## 🎯 How It Works

```
1. Click "View Details" on approved order
   ↓
2. Click green "Create Label" button
   ↓
3. System generates label via ShipEngine
   ↓
4. Tracking info displays automatically
   ↓
5. Click "Download Label (PDF)" to print
   ↓
6. Ship package with printed label!
```

---

## 🏷️ What Gets Added to Labels

Your labels automatically include:
- **Order Number:** MC-1234
- **Item Type:** "2 Embroidered Items"
- **Customer Name:** John Doe

These appear on the physical shipping label!

---

## 📦 Files Created/Modified

### **Backend (New Files):**
- ✅ `backend/src/services/shipEngineLabelService.ts`
- ✅ `backend/src/controllers/labelController.ts`
- ✅ `backend/src/routes/labelRoute.ts`
- ✅ `backend/src/scripts/add-label-fields.sql`

### **Backend (Modified):**
- ✅ `backend/src/app.ts` (added label routes)

### **Frontend (Modified):**
- ✅ `frontend/src/admin/pages/PendingReview.tsx` (added UI & handlers)
- ✅ `frontend/src/shared/orderReviewApiService.ts` (added types)

---

## 🔌 API Endpoints

**Create Label:**
```
POST /api/v1/labels/create
Body: { orderId: 123 }
```

**Get Label Info:**
```
GET /api/v1/labels/order/123
```

---

## 🎨 UI Components Added

### **In Order Details Modal:**

1. **Green "Create Label" Button**
   - Shows when: Order approved, no tracking yet
   - Action: Creates ShipEngine label
   - Icon: Printer

2. **Purple "Download Label" Button**
   - Shows when: Label already created
   - Action: Opens PDF in new tab
   - Icon: Download

3. **Tracking Information Card**
   - Shows tracking number
   - Shows carrier & service
   - Shows download button
   - Green background

---

## 🧪 Testing

### **Test Flow:**

1. Create a test order
2. Approve the order (status: approved)
3. Click "View Details"
4. Click "Create Label"
5. Wait for success message
6. Verify tracking number displays
7. Click "Download Label"
8. Verify PDF opens

### **Expected Result:**
- ✅ Label PDF generated
- ✅ Tracking number saved
- ✅ Order status → "Shipped"
- ✅ Carrier & service displayed

---

## 🗄️ Database Changes

Added to `order_review` table:
- `shipping_label_url` (TEXT) - PDF URL
- `carrier_code` (VARCHAR) - Carrier name
- `service_code` (VARCHAR) - Service type

---

## 🎉 Success Checklist

- [ ] Database migration completed
- [ ] Environment variables added
- [ ] Backend restarted
- [ ] Frontend compiled
- [ ] Green "Create Label" button visible
- [ ] Button creates label successfully
- [ ] Tracking number displays
- [ ] PDF downloads correctly
- [ ] Order status changes to "Shipped"

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Button not showing | Check order status is "approved" |
| API key error | Add `SHIPENGINE_API_KEY` to `.env` |
| Label creation fails | Check backend logs for details |
| PDF won't open | Check browser popup blocker |

---

## 📊 Flow Diagram

```
Order Approved
    ↓
[Create Label] Button Appears
    ↓
Admin Clicks Button
    ↓
API Call to ShipEngine
    ↓
Label Generated
    ↓
Tracking Info Saved
    ↓
[Download Label] Button Appears
    ↓
Admin Downloads PDF
    ↓
Admin Ships Package
    ↓
Customer Receives Tracking
```

---

## 📚 Full Documentation

See `LABEL_CREATION_GUIDE.md` for complete details including:
- API reference
- Code examples
- Advanced features
- Troubleshooting guide

---

## 🎊 You're Ready!

The label creation feature is fully integrated and ready to use in your admin panel!

**Next Steps:**
1. Run the database migration
2. Add your ShipEngine API key
3. Create a test order
4. Try creating a label!

**Questions?** Check the full guide: `LABEL_CREATION_GUIDE.md`

