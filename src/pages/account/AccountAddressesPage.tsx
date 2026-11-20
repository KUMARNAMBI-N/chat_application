import { useState } from 'react'
import { Formik, Form } from 'formik'
import * as Yup from 'yup'
import { useAuthStore, type Address } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
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

type FormValues = Omit<Address, 'id'>

export default function AccountAddressesPage() {
  const user = useAuthStore((s) => s.user)
  const addAddress = useAuthStore((s) => s.addAddress)
  const removeAddress = useAuthStore((s) => s.removeAddress)
  const setDefaultAddress = useAuthStore((s) => s.setDefaultAddress)
  const notify = useUiStore((s) => s.notifySuccess)

  const [showForm, setShowForm] = useState(false)

  const schema = Yup.object({
    fullName: Yup.string().required('Full name is required').min(2, 'Name too short'),
    mobile: Yup.string()
      .matches(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .required('Mobile number is required'),
    addressLine1: Yup.string().required('Flat/House/Building name is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    pinCode: Yup.string()
      .matches(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN Code')
      .required('PIN Code is required'),
  })

  const emptyValues: FormValues = {
    fullName: user?.name || '',
    mobile: user?.mobile || '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: 'Maharashtra',
    pinCode: '',
    country: 'India',
    isDefault: false,
  }

  async function handleSubmit(values: FormValues) {
    const ok = await addAddress(values)
    if (ok) {
      notify('Indian delivery address saved successfully!')
      setShowForm(false)
    }
  }

  const addresses = user?.addresses ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Saved Delivery Addresses</h2>
          <p className="text-xs text-muted">Manage your delivery locations across India for 1-click checkout</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-bold text-white shadow-theme-sm transition hover:bg-brand-600"
          >
            <IconBase name="plus" size={16} />
            Add New Address
          </button>
        )}
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl border p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-themed pb-4 mb-5">
            <h3 className="font-bold text-heading">Add New Indian Delivery Address</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted hover:text-heading"
            >
              <IconBase name="x" size={20} />
            </button>
          </div>

          <Formik initialValues={emptyValues} validationSchema={schema} onSubmit={handleSubmit}>
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name="fullName" label="Full Name" placeholder="e.g. Rahul Sharma" />
                  <TextField name="mobile" label="Mobile Number (+91)" placeholder="10-digit mobile" maxLength={10} />
                </div>

                <TextField name="addressLine1" label="Flat / House No. / Building" placeholder="e.g. Flat 304, Green Heights" />
                <TextField name="addressLine2" label="Street / Colony / Area (Optional)" placeholder="e.g. Linking Road, Bandra West" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name="landmark" label="Landmark (Optional)" placeholder="e.g. Near National College" />
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
                  <TextField name="pinCode" label="PIN Code" placeholder="6-digit PIN" maxLength={6} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-heading">
                    <input type="checkbox" name="isDefault" className="h-4 w-4 rounded border-themed accent-brand-500" />
                    <span>Set as default Indian delivery address</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-themed pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="h-10 rounded-xl border border-themed px-4 text-xs font-bold text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-10 items-center justify-center rounded-xl bg-brand-500 px-6 text-xs font-bold text-white shadow-theme-sm hover:bg-brand-600 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Saving Address...' : 'Save Address'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="surface-card rounded-3xl border p-8">
          <EmptyState
            icon="home"
            title="No Addresses Saved"
            description="Add your home, office or loved one's delivery address for faster checkout."
            action={
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-theme-md hover:bg-brand-600"
              >
                Add Your First Address
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`surface-card relative rounded-2xl border p-5 shadow-sm transition ${
                a.isDefault ? 'border-brand-500 ring-2 ring-brand-500/15' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-heading text-sm">{a.fullName}</span>
                {a.isDefault && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                    Default Delivery Address
                  </span>
                )}
              </div>

              <p className="text-xs text-muted mb-1">📞 +91 {a.mobile}</p>
              <p className="text-xs text-body leading-relaxed">
                {a.addressLine1}
                {a.addressLine2 ? ', ' + a.addressLine2 : ''}
                {a.landmark ? ' (Near ' + a.landmark + ')' : ''}
                <br />
                {a.city}, {a.state} - <strong>{a.pinCode}</strong>
                <br />
                India
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-themed pt-3 text-xs font-semibold">
                {!a.isDefault ? (
                  <button
                    type="button"
                    onClick={() => setDefaultAddress(a.id)}
                    className="text-brand-600 hover:underline"
                  >
                    Set as Default
                  </button>
                ) : (
                  <span className="text-emerald-600 font-bold">✓ Active</span>
                )}

                <button
                  type="button"
                  onClick={() => removeAddress(a.id)}
                  className="text-error-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
