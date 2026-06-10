declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id?: string
  handler: (response: RazorpayResponse) => void
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, callback: (response: unknown) => void) => void
}

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function initiatePayment(options: {
  amount: number
  description: string
  name: string
  email: string
  phone?: string
  orderId?: string
  onSuccess: (response: RazorpayResponse) => void
  onDismiss?: () => void
}): Promise<void> {
  const loaded = await loadRazorpayScript()
  if (!loaded || !RAZORPAY_KEY) {
    throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID in .env')
  }

  const rzp = new window.Razorpay({
    key: RAZORPAY_KEY,
    amount: options.amount * 100,
    currency: 'INR',
    name: 'VPrint',
    description: options.description,
    order_id: options.orderId,
    handler: options.onSuccess,
    prefill: {
      name: options.name,
      email: options.email,
      contact: options.phone,
    },
    theme: { color: '#1A9B6C' },
    modal: { ondismiss: options.onDismiss },
  })

  rzp.open()
}

export function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY)
}
