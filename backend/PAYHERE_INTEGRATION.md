# PayHere Payment Integration Guide

## Overview
ExamBuddy uses PayHere, Sri Lanka's leading payment gateway, for processing online payments. The system also supports manual bank transfer verification.

## Payment Methods

### 1. Online Payment via PayHere
- Credit/Debit Cards (Visa, MasterCard)
- Mobile Wallets (eZcash, mCash)
- Online Banking

### 2. Bank Transfer (Manual Verification)
- Upload bank slip/receipt
- Admin verification required
- Account activated on approval

---

## PayHere Setup

### 1. Create PayHere Account
1. Visit: https://www.payhere.lk
2. Click "Register as a Merchant"
3. Complete business verification
4. Get Merchant ID and Secret from Dashboard

### 2. Configure Sandbox Mode
For testing, use sandbox mode:
- Sandbox Dashboard: https://sandbox.payhere.lk
- Sandbox Checkout URL: `https://sandbox.payhere.lk/pay/checkout`

### 3. Environment Variables
Add to `.env`:
```bash
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_NOTIFY_URL=https://yourdomain.com/api/v1/payments/notify
PAYHERE_RETURN_URL=https://yourdomain.com/payment/success
PAYHERE_CANCEL_URL=https://yourdomain.com/payment/cancel
PAYHERE_MODE=sandbox  # Change to 'live' for production
PAYHERE_CURRENCY=LKR
```

---

## Payment Flow

### Online Payment Flow
```
1. Student clicks "Pay Online"
2. Backend generates payment request with hash
3. Student redirected to PayHere checkout
4. Student completes payment
5. PayHere sends notification to notify_url (server-to-server)
6. Backend verifies hash and updates payment status
7. Account activated automatically
8. Student redirected to return_url
```

### Bank Transfer Flow
```
1. Student clicks "Bank Transfer"
2. Backend creates pending payment record
3. Student uploads bank slip (Cloudinary)
4. Admin receives notification
5. Admin reviews and approves/rejects
6. Account activated on approval
7. Student receives email notification
```

---

## Implementation

### 1. Generate Payment Hash

PayHere requires MD5 hash for security:

```python
import hashlib

def generate_payhere_hash(merchant_id, order_id, amount, currency, merchant_secret):
    """
    Generate PayHere payment hash
    Format: MD5(merchant_id + order_id + amount + currency + UPPERCASE(MD5(merchant_secret)))
    """
    merchant_secret_hash = hashlib.md5(merchant_secret.encode()).hexdigest().upper()
    hash_string = f"{merchant_id}{order_id}{amount:.2f}{currency}{merchant_secret_hash}"
    return hashlib.md5(hash_string.encode()).hexdigest().upper()

# Example
merchant_id = "1234567"
order_id = "ORDER123"
amount = 1000.00
currency = "LKR"
merchant_secret = "your_secret"

hash_value = generate_payhere_hash(merchant_id, order_id, amount, currency, merchant_secret)
```

### 2. Create Payment Request (Backend)

```python
from fastapi import APIRouter, HTTPException
from app.schemas.payment import PaymentInitiate
from app.config import settings

router = APIRouter()

@router.post("/payments/initiate")
async def initiate_payment(payment: PaymentInitiate, current_user: User):
    # Create payment record in database
    db_payment = Payment(
        student_id=current_user.id,
        amount=payment.amount,
        currency="LKR",
        payment_method=payment.method,  # 'online' or 'bank_transfer'
        status="pending",
        transaction_id=f"ORD-{uuid.uuid4().hex[:12].upper()}"
    )
    db.add(db_payment)
    db.commit()
    
    if payment.method == "online":
        # Generate PayHere checkout data
        hash_value = generate_payhere_hash(
            settings.PAYHERE_MERCHANT_ID,
            db_payment.transaction_id,
            db_payment.amount,
            "LKR",
            settings.PAYHERE_MERCHANT_SECRET
        )
        
        return {
            "payment_id": db_payment.id,
            "checkout_url": "https://sandbox.payhere.lk/pay/checkout",
            "payment_data": {
                "merchant_id": settings.PAYHERE_MERCHANT_ID,
                "return_url": settings.PAYHERE_RETURN_URL,
                "cancel_url": settings.PAYHERE_CANCEL_URL,
                "notify_url": settings.PAYHERE_NOTIFY_URL,
                "order_id": db_payment.transaction_id,
                "items": "ExamBuddy Subscription",
                "currency": "LKR",
                "amount": f"{db_payment.amount:.2f}",
                "first_name": current_user.student.full_name.split()[0],
                "last_name": current_user.student.full_name.split()[-1] if len(current_user.student.full_name.split()) > 1 else "",
                "email": current_user.email,
                "phone": current_user.student.phone_number,
                "address": current_user.student.school,
                "city": current_user.student.district,
                "country": "Sri Lanka",
                "hash": hash_value
            }
        }
    else:
        # Bank transfer - return upload instructions
        return {
            "payment_id": db_payment.id,
            "order_id": db_payment.transaction_id,
            "bank_details": {
                "bank_name": "Bank of Ceylon",
                "account_name": "ExamBuddy (Pvt) Ltd",
                "account_number": "1234567890",
                "branch": "Colombo Main Branch"
            },
            "upload_url": "/api/v1/payments/upload-receipt"
        }
```

### 3. Frontend Payment Form (React/Next.js)

```javascript
// Auto-submit form to PayHere
const handlePayHerePayment = (paymentData) => {
  // Create a hidden form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentData.checkout_url;
  
  // Add all payment fields
  Object.keys(paymentData.payment_data).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = paymentData.payment_data[key];
    form.appendChild(input);
  });
  
  // Submit form
  document.body.appendChild(form);
  form.submit();
};
```

### 4. PayHere Notify Callback (Backend)

```python
@router.post("/payments/notify")
async def payhere_notify(request: Request):
    """
    PayHere sends notification here after payment
    This is server-to-server, not seen by user
    """
    form_data = await request.form()
    
    # Extract data
    merchant_id = form_data.get("merchant_id")
    order_id = form_data.get("order_id")
    payment_id = form_data.get("payment_id")
    payhere_amount = form_data.get("payhere_amount")
    payhere_currency = form_data.get("payhere_currency")
    status_code = form_data.get("status_code")
    md5sig = form_data.get("md5sig")
    
    # Verify hash
    merchant_secret = settings.PAYHERE_MERCHANT_SECRET
    merchant_secret_hash = hashlib.md5(merchant_secret.encode()).hexdigest().upper()
    
    local_md5sig = hashlib.md5(
        f"{merchant_id}{order_id}{payhere_amount}{payhere_currency}{status_code}{merchant_secret_hash}".encode()
    ).hexdigest().upper()
    
    if local_md5sig != md5sig:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Update payment in database
    db_payment = db.query(Payment).filter(Payment.transaction_id == order_id).first()
    
    if status_code == "2":  # Success
        db_payment.status = "verified"
        db_payment.verified_at = datetime.now()
        
        # Activate student account
        student = db_payment.student
        student.has_paid = True
        student.payment_verified_at = datetime.now()
        student.user.is_active = True
        
        db.commit()
        
        # Send notification to student
        send_notification(student.user_id, "Payment Successful", "Your account has been activated!")
    
    elif status_code == "0":  # Pending
        db_payment.status = "pending"
        db.commit()
    
    elif status_code == "-1" or status_code == "-2" or status_code == "-3":  # Failed/Canceled
        db_payment.status = "rejected"
        db.commit()
    
    return {"status": "OK"}
```

### 5. Bank Slip Upload

```python
@router.post("/payments/upload-receipt")
async def upload_receipt(
    payment_id: str,
    file: UploadFile,
    current_user: User
):
    # Validate file
    if file.content_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(400, "Only JPG, PNG, PDF allowed")
    
    # Upload to Cloudinary
    from app.utils.file_upload import upload_to_cloudinary
    receipt_url = await upload_to_cloudinary(file, folder="receipts")
    
    # Update payment
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.student_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(404, "Payment not found")
    
    payment.receipt_url = receipt_url
    payment.status = "pending"
    db.commit()
    
    # Notify admin
    notify_admin_new_payment(payment.id)
    
    return {"message": "Receipt uploaded successfully", "receipt_url": receipt_url}
```

### 6. Admin Verification

```python
@router.patch("/admin/payments/{payment_id}/verify")
async def verify_payment(
    payment_id: str,
    action: str,  # 'approve' or 'reject'
    notes: str = None,
    current_admin: User = Depends(get_current_admin)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise HTTPException(404, "Payment not found")
    
    if action == "approve":
        payment.status = "verified"
        payment.verified_by = current_admin.id
        payment.verified_at = datetime.now()
        payment.notes = notes
        
        # Activate student account
        student = payment.student
        student.has_paid = True
        student.payment_verified_at = datetime.now()
        student.user.is_active = True
        
        # Send success notification
        send_notification(
            student.user_id,
            "Payment Approved",
            "Your payment has been verified. You can now access all papers!"
        )
    
    elif action == "reject":
        payment.status = "rejected"
        payment.verified_by = current_admin.id
        payment.verified_at = datetime.now()
        payment.notes = notes
        
        # Send rejection notification
        send_notification(
            payment.student.user_id,
            "Payment Rejected",
            f"Your payment was rejected. Reason: {notes}"
        )
    
    db.commit()
    return {"message": f"Payment {action}d successfully"}
```

---

## PayHere Test Cards (Sandbox)

Use these test cards in sandbox mode:

| Card Number         | Type       | Result  |
|---------------------|------------|---------|
| 4916217501611292    | Visa       | Success |
| 5200000000001096    | MasterCard | Success |
| 4916217501611219    | Visa       | Failed  |

**Test CVV**: Any 3 digits
**Test Expiry**: Any future date

---

## Security Checklist

- [ ] Always verify MD5 hash on notify callback
- [ ] Use HTTPS for notify_url in production
- [ ] Store merchant_secret securely (never commit to git)
- [ ] Validate payment amounts match database records
- [ ] Log all payment transactions
- [ ] Implement rate limiting on payment endpoints
- [ ] Validate file types for receipt uploads
- [ ] Use unique order IDs (prevent duplicate payments)

---

## Bank Details Template

For bank transfer option, provide these details to students:

```
Bank: Bank of Ceylon
Account Name: ExamBuddy (Pvt) Ltd
Account Number: 1234567890
Branch: Colombo Main Branch
Branch Code: 7010

After payment, please upload your bank slip with the following details:
- Your name
- Transaction reference number
- Date and time of payment
```

---

## Error Handling

Common PayHere status codes:

| Code | Meaning                |
|------|------------------------|
| 2    | Success                |
| 0    | Pending                |
| -1   | Canceled               |
| -2   | Failed                 |
| -3   | Chargedback            |

---

## Testing Checklist

- [ ] Test successful payment flow
- [ ] Test payment cancellation
- [ ] Test payment failure
- [ ] Test bank slip upload
- [ ] Test admin approval
- [ ] Test admin rejection
- [ ] Test duplicate payment prevention
- [ ] Test hash verification
- [ ] Test account activation
- [ ] Test notification emails

---

## Production Deployment

Before going live:

1. Change `PAYHERE_MODE=live` in .env
2. Update checkout URL to: `https://www.payhere.lk/pay/checkout`
3. Get live credentials from PayHere dashboard
4. Update notify_url to production domain (must be HTTPS)
5. Test with small real amount
6. Enable PayHere account monitoring

---

## Support

- PayHere Documentation: https://support.payhere.lk
- PayHere API Docs: https://support.payhere.lk/api-&-mobile-sdk
- Integration Support: support@payhere.lk
