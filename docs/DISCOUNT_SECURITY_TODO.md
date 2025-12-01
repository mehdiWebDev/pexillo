# 🔒 Discount System Security Improvements TODO

## Overview
This document outlines security improvements for the Pexillo discount system. These are enhancements to implement when ready, without breaking existing functionality.

---

## 🔴 HIGH PRIORITY - Security Vulnerabilities

### 1. Race Condition in Single-Use Discounts
**Issue**: Users can apply the same single-use discount multiple times by opening multiple browser tabs

**Current State**:
- Validation happens at checkout start
- Usage is only recorded after payment completes
- Gap allows multiple simultaneous applications

**Solution to Implement**:
```sql
-- In validate_discount_code function, add:
-- Check for pending orders with this discount
SELECT COUNT(*) INTO v_pending_count
FROM orders o
WHERE o.user_id = p_user_id
  AND o.discount_code_id = v_discount.id
  AND o.payment_status = 'pending'
  AND o.created_at > NOW() - INTERVAL '30 minutes';

-- Include pending orders in the usage count
v_user_usage_count := v_user_usage_count + v_pending_count;
```

**Files to Modify**:
- `database/functions/validate_discount_code.sql`

---

### 2. Client-Provided Discount Amount Verification
**Issue**: Frontend calculates and sends discount amount to payment intent without server verification

**Current State**:
- Frontend calculates `amountOff`
- Sends directly to Stripe payment intent
- No server-side verification

**Solution to Implement**:
```typescript
// In create-payment-intent/route.ts
if (discount) {
  // Re-validate discount server-side
  const validation = await discountService.validateDiscountCode(
    discount.code,
    originalSubtotal,
    items,
    userId
  );

  if (!validation.isValid) {
    return NextResponse.json(
      { error: 'Discount is no longer valid' },
      { status: 400 }
    );
  }

  // Verify amounts match
  if (Math.abs(validation.amountOff - discount.amountOff) > 0.01) {
    console.error('SECURITY: Discount amount mismatch!', {
      expected: validation.amountOff,
      received: discount.amountOff,
      user: userId,
      code: discount.code
    });
    // Use server-calculated amount
    amount = originalAmount - (validation.amountOff * 100); // Convert to cents
  }
}
```

**Files to Modify**:
- `src/app/api/stripe/create-payment-intent/route.ts`

---

### 3. Rate Limiting for Discount Validation
**Issue**: No protection against brute force attempts to guess discount codes

**Current State**:
- Unlimited attempts to validate discount codes
- No tracking of failed attempts
- Could be exploited to find valid codes

**Solution to Implement**:
```typescript
// Option 1: Using Vercel KV or Redis
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 attempts per minute
});

// In validate/route.ts
export async function POST(req: NextRequest) {
  const ip = req.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }
  // ... rest of validation
}

// Option 2: Simple in-memory rate limiting
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userAttempts = attempts.get(ip);

  if (!userAttempts || userAttempts.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }

  if (userAttempts.count >= 10) {
    return false; // Rate limit exceeded
  }

  userAttempts.count++;
  return true;
}
```

**Files to Modify**:
- `src/app/api/discounts/validate/route.ts`

---

## ⚠️ MEDIUM PRIORITY - Security Enhancements

### 4. CSRF Protection
**Issue**: No CSRF tokens on state-changing operations

**Solution to Implement**:
```typescript
// Generate CSRF token on session creation
import crypto from 'crypto';

function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store in session/cookie
// Verify on each request
```

**Files to Modify**:
- `src/middleware.ts`
- All POST API routes

---

### 5. Audit Logging
**Issue**: No comprehensive logging of discount usage attempts

**Solution to Implement**:
```sql
-- Create audit log table
CREATE TABLE discount_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  discount_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT, -- 'validate', 'apply', 'remove'
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_audit_user ON discount_audit_log(user_id);
CREATE INDEX idx_audit_code ON discount_audit_log(discount_code);
CREATE INDEX idx_audit_timestamp ON discount_audit_log(created_at);
```

**Files to Create**:
- `database/tables/discount_audit_log.sql`
- `src/services/auditService.ts`

---

### 6. Discount Code Complexity Requirements
**Issue**: No requirements for discount code format/complexity

**Recommendations**:
- Minimum 6 characters
- Mix of letters and numbers
- No sequential patterns (ABC123, 111111)
- No common words
- Consider using nanoid for generation

**Implementation**:
```typescript
import { customAlphabet } from 'nanoid';

// Generate secure discount codes
const generateCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
const code = generateCode(); // e.g., "A7B9X2M4"
```

---

## 📊 LOW PRIORITY - Monitoring & Analytics

### 7. Suspicious Activity Detection
**Track and Alert on**:
- Multiple failed attempts from same IP
- Rapid succession of different codes
- Unusual geographic patterns
- High-value discount attempts

**Implementation**:
```typescript
interface SuspiciousActivity {
  failedAttempts: number;
  differentCodes: Set<string>;
  lastAttemptTime: Date;
  totalDiscountValue: number;
}

// Alert if:
// - More than 5 failed attempts in 5 minutes
// - More than 10 different codes tried
// - Total discount attempts > $500 in 1 hour
```

---

## 📝 Implementation Checklist

### Phase 1 - Logging Only (No Risk)
- [ ] Add IP logging to discount validation
- [ ] Log all discount applications with metadata
- [ ] Monitor for patterns without blocking

### Phase 2 - Soft Enforcement (Low Risk)
- [ ] Add pending order check for race condition
- [ ] Verify discount amounts (log mismatches)
- [ ] Implement soft rate limits (warn only)

### Phase 3 - Full Enforcement (Test Thoroughly)
- [ ] Enable blocking for rate limits
- [ ] Reject mismatched discount amounts
- [ ] Add CSRF protection
- [ ] Enable audit logging

---

## 🧪 Testing Requirements

Before implementing each change:
1. Test with existing discount codes
2. Verify no impact on current checkouts
3. Test edge cases:
   - Expired discounts
   - Multiple discounts (stackable)
   - Guest vs authenticated users
   - Different product categories
4. Load test to ensure no performance degradation

---

## 🎯 Success Metrics

Monitor after implementation:
- No increase in checkout abandonment
- No increase in support tickets
- Reduction in suspicious discount usage
- No false positives blocking legitimate users

---

## 📅 Suggested Timeline

**Week 1-2**: Implement logging and monitoring
**Week 3-4**: Analyze logs, adjust thresholds
**Week 5-6**: Implement Phase 2 with feature flags
**Week 7-8**: Enable Phase 3 gradually
**Week 9+**: Full enforcement and monitoring

---

## 🚨 Rollback Plan

Each security feature should have:
1. Feature flag to disable instantly
2. Logging before enforcement
3. Gradual rollout (5% → 25% → 50% → 100%)
4. Clear error messages for support team
5. Database migrations that can be reversed

---

## 📚 References

- [OWASP Discount Fraud](https://owasp.org/www-project-web-security-testing-guide/)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security)

---

## Notes

**Last Security Audit**: December 1, 2024
**Current Security Score**: 7/10
**Target Security Score**: 9/10

**Contact**: For questions about implementation, consult with the security team before making changes to payment flow.