# Payment System Setup Guide

ExamBuddy supports two payment methods:
1. **PayHere** - Automatic activation after successful payment
2. **Bank Slip Upload** - Manual admin verification required

## Backend Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# PayHere Configuration
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_SANDBOX=True  # Set to False for production

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### 2. Database Setup

The payment system uses these models:
- `Payment` - Main payment records
- `BankSlip` - Bank slip uploads for manual verification

Run migrations if needed:
```bash
cd backend
alembic revision --autogenerate -m "Add payment tables"
alembic upgrade head
```

### 3. Static Files Directory

Bank slip images are stored in `backend/uploads/bank_slips/`. This directory is auto-created, but ensure proper permissions:

```bash
mkdir -p backend/uploads/bank_slips
chmod 755 backend/uploads
```

### 4. PayHere Account Setup

1. Register at [PayHere.lk](https://www.payhere.lk/)
2. Get your Merchant ID and Secret from the dashboard
3. Configure return URLs:
   - Success: `http://localhost:3000/payment/success`
   - Cancel: `http://localhost:3000/payment/cancel`
   - Notify (webhook): `http://localhost:8000/api/v1/payment/payhere/notify`

**Note:** For development, PayHere sandbox mode is recommended. Set `PAYHERE_SANDBOX=True`.

## Frontend Configuration

No additional configuration needed. The payment flow is automatically integrated.

## Payment Flow

### For Students

#### Method 1: PayHere (Instant Activation)

1. Student clicks "Purchase" on a course or exam
2. Redirected to `/payment` page with item details
3. Selects "Pay with PayHere"
4. PayHere payment gateway opens
5. After successful payment:
   - PayHere sends webhook notification to backend
   - Backend verifies payment signature
   - Auto-activates enrollment
   - Student redirected to success page

#### Method 2: Bank Slip Upload (Manual Review)

1. Student clicks "Purchase" on a course or exam
2. Redirected to `/payment` page with item details
3. Selects "Upload Bank Slip"
4. Fills in:
   - Bank name
   - Depositor name
   - Deposit date
   - Reference number
   - Uploads slip image (max 5MB, JPG/PNG)
5. Submission saved with "Pending" status
6. Waits for admin verification (within 24 hours)
7. Receives activation after admin approval

### For Admins

Access admin panel at `/admin/payments`

#### Review Pending Slips

1. Navigate to "Pending Review" tab
2. Click on any submission to view details:
   - Bank slip image (full size)
   - Student information
   - Deposit details
   - Reference number
3. Options:
   - **Approve & Activate** - Immediately activates enrollment
   - **Reject** - Requires rejection reason

#### View All Submissions

1. Navigate to "All Submissions" tab
2. View history of all bank slips (pending, verified, rejected)
3. Filter by status if needed

## API Endpoints

### Student Endpoints

```
POST   /api/v1/payment/initiate
GET    /api/v1/payment/payhere/config?payment_id={id}
POST   /api/v1/payment/payhere/notify  # Webhook
POST   /api/v1/payment/bank-slip/upload
GET    /api/v1/payment/my-payments
GET    /api/v1/payment/payment/{id}
```

### Admin Endpoints

```
GET    /api/v1/admin/payment/pending-slips
GET    /api/v1/admin/payment/all-slips?status_filter={status}
GET    /api/v1/admin/payment/slip/{id}
POST   /api/v1/admin/payment/verify-slip/{id}
GET    /api/v1/admin/payment/stats
GET    /api/v1/admin/payment/all-payments
```

## Testing

### PayHere Sandbox Testing

1. Set `PAYHERE_SANDBOX=True` in `.env`
2. Use PayHere test cards:
   - **Visa**: 4916217501611292
   - **MasterCard**: 5307731766910962
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date

### Bank Slip Testing

1. Upload any image file (JPG/PNG, max 5MB)
2. Fill in test deposit details
3. Login as admin to verify the submission

## Security Features

### PayHere Security
- **MD5 Hash Verification**: All PayHere notifications are verified using merchant secret
- **Order ID Validation**: Prevents duplicate payment processing
- **Signature Mismatch Detection**: Rejects tampered webhook calls

### Bank Slip Security
- **File Type Validation**: Only JPG, PNG allowed
- **File Size Limit**: 5MB maximum
- **Secure Storage**: Files stored outside web root
- **Admin-Only Access**: Only admins can verify/reject slips

### General Security
- **JWT Authentication**: All endpoints require valid authentication
- **Role-Based Access**: Admin endpoints check user role
- **CORS Protection**: Configured for allowed origins only

## Troubleshooting

### PayHere Payment Fails

**Issue**: Payment gateway doesn't open or fails
- Check `PAYHERE_MERCHANT_ID` is correct
- Verify `PAYHERE_SANDBOX` mode matches account type
- Check browser console for script loading errors
- Ensure PayHere script is loading: `https://www.payhere.lk/lib/payhere.js`

**Issue**: Webhook not received
- Verify `BACKEND_URL` is publicly accessible (use ngrok for local testing)
- Check PayHere dashboard webhook logs
- Ensure notify endpoint is correct: `{BACKEND_URL}/api/v1/payment/payhere/notify`

### Bank Slip Upload Fails

**Issue**: "File too large" error
- Maximum file size is 5MB
- Compress image or use lower resolution

**Issue**: Upload succeeds but image not showing
- Check `backend/uploads/bank_slips/` directory permissions
- Verify static files are mounted in `main.py`
- Check image URL in browser network tab

### Enrollment Not Activated

**Issue**: Payment completed but course/exam not accessible
- Check payment status in database
- Verify `_activate_enrollment` function was called
- Check for errors in backend logs
- Ensure `CourseEnrollment` or `ExamEnrollment` was created

## Production Deployment

### Before Going Live

1. **Update Environment Variables**:
   ```env
   PAYHERE_SANDBOX=False
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   ```

2. **Configure Real PayHere Account**:
   - Switch from sandbox to live merchant ID
   - Update return URLs with production domain
   - Update webhook URL (must be HTTPS)

3. **Enable HTTPS**:
   - PayHere requires HTTPS for production webhooks
   - Use SSL certificate (Let's Encrypt recommended)

4. **File Storage**:
   - Consider using cloud storage (S3, Cloudinary) for bank slips
   - Current setup uses local filesystem (fine for small scale)

5. **Backup Strategy**:
   - Regular database backups (payments are critical data)
   - Backup uploaded bank slip images

6. **Monitoring**:
   - Monitor webhook failures
   - Track payment success/failure rates
   - Alert on pending bank slips > 24 hours

## Notes

- PayHere charges a transaction fee (check their pricing)
- Bank slip verification requires manual admin work
- Payment refunds must be processed outside the system
- All amounts are in LKR (Sri Lankan Rupees)

## Support

For PayHere integration issues, contact: [PayHere Support](https://support.payhere.lk/)

For application issues, check backend logs:
```bash
cd backend
tail -f logs/app.log  # If logging configured
```
