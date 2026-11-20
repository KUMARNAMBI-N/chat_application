import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import * as Yup from 'yup'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useOrdersStore, type PaymentMethod } from '@/stores/orders'
import { formatPrice } from '@/lib/format'
import { TextField, SelectField } from '@/components/ui/FormikField'
import IconBase from '@/components/ui/IconBase'
import EmptyState from '@/components/ui/EmptyState'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

interface CheckoutValues {
  name: string
  email: string
  mobile: string
  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  pinCode: string
  payment: PaymentMethod
  upiId: string
  cardNumber: string
  cardName: string
  cardExpiry: string
  cardCvv: string
  netBank: string
}

const STEPS = ['Contact Details', 'Delivery Address', 'Payment Method', 'Review & Pay'] as const

export default function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const discount = useCartStore((s) => s.discount())
  const shipping = useCartStore((s) => s.shipping())
  const gst = useCartStore((s) => s.gst())
  const total = useCartStore((s) => s.total())
  const clearCart = useCartStore((s) => s.clear)
  const placeOrder = useOrdersStore((s) => s.placeOrder)
  const isOrdering = useOrdersStore((s) => s.loading)

  const [stepIndex, setStepIndex] = useState(0)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon="cart"
          title="Your Shopping Cart is Empty"
          description="Add items to your cart before proceeding to checkout."
          action={
            <Link
              to="/produtos"
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-theme-md hover:bg-brand-600"
            >
              Start Shopping
            </Link>
          }
        />
      </div>
    )
  }

  const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0]

  const initialValues: CheckoutValues = {
    name: user?.name || defaultAddr?.fullName || '',
    email: user?.email || '',
    mobile: user?.mobile || defaultAddr?.mobile || '',
    addressLine1: defaultAddr?.addressLine1 || '',
    addressLine2: defaultAddr?.addressLine2 || '',
    landmark: defaultAddr?.landmark || '',
    city: defaultAddr?.city || '',
    state: defaultAddr?.state || 'Maharashtra',
    pinCode: defaultAddr?.pinCode || '',
    payment: 'UPI',
    upiId: '',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    netBank: 'HDFC Bank',
  }

  const stepSchemas = [
    // Step 0: Contact
    Yup.object({
      name: Yup.string().required('Full name is required').min(2, 'Name too short'),
      email: Yup.string().email('Enter a valid email address').required('Email is required'),
      mobile: Yup.string()
        .matches(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
        .required('Mobile number is required for delivery OTP'),
    }),
    // Step 1: Address
    Yup.object({
      addressLine1: Yup.string().required('Flat / House / Building name is required'),
      city: Yup.string().required('City / Town is required'),
      state: Yup.string().required('State is required'),
      pinCode: Yup.string()
        .matches(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN Code')
        .required('PIN Code is required'),
    }),
    // Step 2: Payment
    Yup.object({
      payment: Yup.string().required('Select a payment method'),
      upiId: Yup.string().when('payment', {
        is: 'UPI',
        then: (s) => s.required('Enter your VPA / UPI ID (e.g. mobile@upi)'),
      }),
      cardNumber: Yup.string().when('payment', {
        is: 'Credit/Debit Card',
        then: (s) => s.required('Enter 16-digit card number').min(15, 'Invalid card number'),
      }),
      cardName: Yup.string().when('payment', {
        is: 'Credit/Debit Card',
        then: (s) => s.required('Name on card is required'),
      }),
      cardExpiry: Yup.string().when('payment', {
        is: 'Credit/Debit Card',
        then: (s) => s.required('Expiry (MM/YY) is required'),
      }),
      cardCvv: Yup.string().when('payment', {
        is: 'Credit/Debit Card',
        then: (s) => s.required('CVV is required').min(3, 'Invalid CVV'),
      }),
    }),
    // Step 3: Review
    Yup.object({}),
  ]

  async function handleSubmit(values: CheckoutValues) {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }

    const shippingAddress = `${values.addressLine1}${values.addressLine2 ? ', ' + values.addressLine2 : ''}${
      values.landmark ? ' (Near ' + values.landmark + ')' : ''
    }, ${values.city}, ${values.state} - ${values.pinCode}`

    await placeOrder({
      items,
      subtotal,
      discount,
      shipping,
      gst,
      total,
      payment: values.payment,
      shippingAddress,
    })

    clearCart()
    navigate('/pedido/confirmado')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title & Trust Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-heading sm:text-3xl">Secure Indian Checkout</h1>
        <p className="mt-1 text-sm text-muted">
          All transactions are processed securely in Indian Rupees (₹ INR) with encrypted protection.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all shadow-sm ${
                  i < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : i === stepIndex
                    ? 'bg-brand-500 text-white shadow-theme-md scale-105'
                    : 'border border-themed bg-white text-muted dark:bg-gray-800'
                }`}
              >
                {i < stepIndex ? <IconBase name="check" size={16} /> : i + 1}
              </span>
              <span className={`hidden text-xs sm:text-sm font-semibold md:block ${i === stepIndex ? 'text-heading' : 'text-muted'}`}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`mx-3 h-1 flex-1 rounded-full transition-colors ${
                  i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={stepSchemas[stepIndex]}
        onSubmit={handleSubmit}
        validateOnMount={false}
      >
        {({ values, setFieldValue }) => (
          <Form className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Left Column: Form Steps */}
            <div className="surface-card rounded-3xl border p-6 shadow-sm sm:p-8">
              {/* STEP 0: Contact */}
              {stepIndex === 0 && (
                <div className="space-y-5">
                  <div className="border-b border-themed pb-4">
                    <h2 className="text-lg font-bold text-heading">1. Customer Identification</h2>
                    <p className="text-xs text-muted">We will send your order confirmation and live delivery tracking here.</p>
                  </div>

                  <TextField name="name" label="Full Name" placeholder="e.g. Rahul Sharma" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField name="email" type="email" label="Email Address" placeholder="name@example.com" />
                    <TextField name="mobile" type="tel" label="Mobile Number (+91)" placeholder="10-digit mobile" />
                  </div>
                </div>
              )}

              {/* STEP 1: Address */}
              {stepIndex === 1 && (
                <div className="space-y-5">
                  <div className="border-b border-themed pb-4">
                    <h2 className="text-lg font-bold text-heading">2. Indian Delivery Address</h2>
                    <p className="text-xs text-muted">Please provide exact address details with Landmark and 6-digit PIN code.</p>
                  </div>

                  <TextField name="addressLine1" label="Flat / House No. / Building Name" placeholder="e.g. Flat 304, Green Heights" />
                  <TextField name="addressLine2" label="Street / Road / Area (Optional)" placeholder="e.g. Linking Road, Bandra West" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField name="landmark" label="Nearby Landmark (Optional)" placeholder="e.g. Near National College" />
                    <TextField name="city" label="City / Town" placeholder="e.g. Mumbai" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField name="state" label="State / Union Territory">
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </SelectField>
                    <TextField name="pinCode" label="PIN Code" placeholder="6-digit postal code" maxLength={6} />
                  </div>

                  <div className="rounded-xl bg-brand-50/60 p-3.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    🇮🇳 Country: <strong>India</strong> (Fast doorstep delivery enabled for this PIN code)
                  </div>
                </div>
              )}

              {/* STEP 2: Indian Payment Methods */}
              {stepIndex === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-themed pb-4">
                    <h2 className="text-lg font-bold text-heading">3. Choose Payment Method</h2>
                    <p className="text-xs text-muted">Safe, encrypted and verified transaction in Indian Rupees (₹ INR).</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', icon: 'zap', desc: 'Fast, zero transaction fee' },
                        { id: 'Credit/Debit Card', label: 'Credit or Debit Card', icon: 'credit-card', desc: 'Visa, Mastercard, RuPay' },
                        { id: 'Net Banking', label: 'Net Banking', icon: 'home', desc: 'All major Indian banks' },
                        { id: 'Cash on Delivery', label: 'Cash on Delivery (COD)', icon: 'truck', desc: 'Pay cash or UPI at doorstep' },
                      ] as { id: PaymentMethod; label: string; icon: string; desc: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFieldValue('payment', m.id)}
                        className={`flex flex-col rounded-2xl border p-4 text-left transition ${
                          values.payment === m.id
                            ? 'border-brand-500 bg-brand-50/70 shadow-sm dark:bg-brand-500/15 ring-2 ring-brand-500/20'
                            : 'border-themed bg-gray-50/50 hover:bg-gray-100/70 dark:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconBase name={m.icon} size={18} className={values.payment === m.id ? 'text-brand-600' : 'text-muted'} />
                          <span className="font-bold text-sm text-heading">{m.label}</span>
                        </div>
                        <span className="mt-1 text-xs text-muted">{m.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* UPI Input */}
                  {values.payment === 'UPI' && (
                    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 space-y-3 dark:border-brand-500/20 dark:bg-brand-500/5">
                      <TextField name="upiId" label="Enter UPI ID / VPA" placeholder="yourname@okhdfcbank or 9876543210@upi" />
                      <p className="text-xs text-muted">
                        A payment request will be sent to your UPI app for authorization upon clicking place order.
                      </p>
                    </div>
                  )}

                  {/* Card Input */}
                  {values.payment === 'Credit/Debit Card' && (
                    <div className="space-y-4 rounded-2xl border border-themed bg-gray-50/50 p-4 dark:bg-gray-800/40">
                      <TextField name="cardNumber" label="Card Number" placeholder="XXXX XXXX XXXX XXXX" maxLength={19} />
                      <TextField name="cardName" label="Name on Card" placeholder="As printed on card" />
                      <div className="grid grid-cols-2 gap-4">
                        <TextField name="cardExpiry" label="Expiry Date" placeholder="MM/YY" maxLength={5} />
                        <TextField name="cardCvv" label="CVV" placeholder="3 digits" maxLength={4} type="password" />
                      </div>
                    </div>
                  )}

                  {/* Net Banking */}
                  {values.payment === 'Net Banking' && (
                    <div className="space-y-3 rounded-2xl border border-themed bg-gray-50/50 p-4 dark:bg-gray-800/40">
                      <SelectField name="netBank" label="Select Bank">
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Punjab National Bank">Punjab National Bank</option>
                      </SelectField>
                    </div>
                  )}

                  {/* Cash on Delivery Notice */}
                  {values.payment === 'Cash on Delivery' && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      💡 <strong>Doorstep Payment Enabled:</strong> You can pay with Cash or UPI directly to our verified delivery executive upon delivery.
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Review */}
              {stepIndex === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-themed pb-4">
                    <h2 className="text-lg font-bold text-heading">4. Review Order & Confirm</h2>
                    <p className="text-xs text-muted">Verify your delivery information and items before placing the order.</p>
                  </div>

                  <div className="rounded-2xl border border-themed bg-gray-50/50 p-4 space-y-2 dark:bg-gray-800/40">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Delivery Address</p>
                    <p className="text-sm font-semibold text-heading">{values.name} (Ph: {values.mobile})</p>
                    <p className="text-xs text-body">
                      {values.addressLine1}, {values.city}, {values.state} - {values.pinCode}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-themed bg-gray-50/50 p-4 space-y-2 dark:bg-gray-800/40">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Payment Mode</p>
                    <p className="text-sm font-bold text-brand-600">{values.payment}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Items Ordered ({items.length})</p>
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center gap-3 border-b border-themed pb-3">
                        <img src={it.image} alt={it.name} className="h-12 w-12 rounded-lg object-cover border" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-heading truncate">{it.name}</p>
                          <p className="text-xs text-muted">Qty: {it.qty} × {formatPrice(it.price)}</p>
                        </div>
                        <p className="text-sm font-bold text-heading">{formatPrice(it.price * it.qty)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between border-t border-themed pt-6">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => i - 1)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-themed px-5 text-sm font-bold text-body transition hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <IconBase name="arrow-left" size={16} />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isOrdering}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-8 text-sm font-bold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-98 disabled:opacity-70"
                >
                  {isOrdering && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>{stepIndex === STEPS.length - 1 ? (isOrdering ? 'Placing Order...' : `Pay & Place Order • ${formatPrice(total)}`) : 'Continue'}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary in ₹ INR */}
            <div>
              <div className="surface-card sticky top-32 rounded-3xl border p-6 shadow-sm">
                <h3 className="border-b border-themed pb-3 font-bold text-heading">Price Details ({items.length} items)</h3>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between text-body">
                    <span>Price Subtotal</span>
                    <span className="font-semibold text-heading">{formatPrice(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount Coupon</span>
                      <span className="font-semibold">-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-body">
                    <span>Applicable GST (18%)</span>
                    <span className="text-muted">{formatPrice(gst)}</span>
                  </div>

                  <div className="flex justify-between text-body">
                    <span>Delivery Charges</span>
                    <span className={shipping === 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-heading'}>
                      {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                    </span>
                  </div>

                  <div className="border-t border-themed pt-3 flex justify-between text-base font-extrabold text-heading">
                    <span>Total Amount</span>
                    <span className="text-brand-600 text-lg">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <IconBase name="shield-check" size={15} />
                    100% Purchase Protection
                  </p>
                  <p>Guaranteed safe dispatch across India with contactless doorstep delivery.</p>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}
