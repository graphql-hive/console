import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Organization / Billing',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Organization Billing Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Billing and subscription management components powered by Stripe. Includes plan selection,
        payment methods, invoices, usage tracking, rate limit warnings, and pro plan billing
        features.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Billing Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Billing.tsx - Main billing page with subscription overview</li>
        <li>BillingPlanPicker.tsx - Plan selection UI (Free, Pro, Enterprise)</li>
        <li>BillingPaymentMethod.tsx - Credit card management via Stripe</li>
        <li>InvoicesList.tsx - Historical invoices table</li>
        <li>PlanSummary.tsx - Current plan details and usage</li>
        <li>ProPlanBillingWarm.tsx - Upgrade prompts for pro features</li>
        <li>RateLimitWarn.tsx - Warning when approaching rate limits</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Billing Main Page</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Sections:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Current plan card with features</li>
          <li>Usage statistics (operations, seats, etc.)</li>
          <li>Payment method section</li>
          <li>Billing history/invoices</li>
          <li>Plan upgrade/downgrade options</li>
          <li>Cancel subscription button</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Billing Plan Picker</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Plans:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Free - Hobby tier with basic features</li>
          <li>Pro - $10/month, advanced features, higher limits</li>
          <li>Enterprise - Custom pricing, unlimited usage</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features comparison:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Operations per month limit</li>
          <li>Team members/seats</li>
          <li>Schema checks</li>
          <li>CDN access</li>
          <li>Support level</li>
          <li>SSO/OIDC (Enterprise only)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Billing Payment Method</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Stripe Elements for secure card entry</li>
          <li>Card brand icon display (Visa, Mastercard, etc.)</li>
          <li>Last 4 digits and expiry shown</li>
          <li>Update payment method button</li>
          <li>Remove payment method option</li>
          <li>3D Secure (SCA) support</li>
          <li>Billing address collection</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Invoices List</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Invoice Number (Stripe ID)
- Date (created date)
- Amount (USD)
- Status (Paid, Failed, Pending)
- Download PDF (link to Stripe invoice)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Sortable by date</li>
          <li>Pagination for old invoices</li>
          <li>Status badges (green paid, red failed)</li>
          <li>Direct link to Stripe hosted invoice</li>
          <li>Download PDF button</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Plan Summary</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Displays:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Current plan name (Free/Pro/Enterprise)</li>
          <li>Monthly/annual pricing</li>
          <li>Next billing date</li>
          <li>Usage this period (operations, seats)</li>
          <li>Percentage of limits used</li>
          <li>Progress bars for usage</li>
          <li>Overage warnings if applicable</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Pro Plan Billing Warm</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Upgrade prompts shown when:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Approaching free tier limits</li>
          <li>Trying to use pro feature</li>
          <li>Banner at top of page</li>
          <li>"Upgrade to Pro" CTA button</li>
          <li>Feature comparison modal</li>
          <li>Links to pricing page</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Rate Limit Warning</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Alert shown when:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Approaching monthly operation limit (80%)</li>
          <li>Exceeded limit (throttled)</li>
          <li>Warning callout with usage percentage</li>
          <li>Upgrade or contact support CTA</li>
          <li>Red alert when over 100%</li>
          <li>Yellow warning at 80-99%</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Subscription Management</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Actions:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Upgrade plan (Free → Pro)</li>
          <li>Downgrade plan (Pro → Free)</li>
          <li>Change billing cycle (monthly ↔ annual)</li>
          <li>Add seats (for team growth)</li>
          <li>Cancel subscription (with confirmation)</li>
          <li>Reactivate canceled subscription</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Stripe Integration</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Dependencies:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>@stripe/stripe-js - Stripe JavaScript SDK</li>
          <li>@stripe/react-stripe-js - Stripe React components</li>
          <li>Stripe Elements - Secure card input</li>
          <li>Stripe Customer Portal - Self-service billing</li>
          <li>Stripe Checkout - Payment flow</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateStripeSubscription - Subscribe to paid plan</li>
        <li>CancelStripeSubscription - Cancel subscription</li>
        <li>UpdatePaymentMethod - Update credit card</li>
        <li>AddSeats - Increase team size</li>
        <li>DowngradeSubscription - Downgrade plan</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>BillingInfo - Current plan and usage</li>
        <li>Invoices - Historical invoices from Stripe</li>
        <li>PaymentMethod - Current payment method</li>
        <li>RateLimits - Current usage vs limits</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Common UI Patterns</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Billing components use:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Card components for sections</li>
          <li>Table for invoices</li>
          <li>Progress bars for usage</li>
          <li>Badge components for status</li>
          <li>Callout components for warnings</li>
          <li>Modal dialogs for confirmations</li>
          <li>Skeleton loaders while fetching</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Pricing Tiers</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">Free</code>
          <span className="text-neutral-11 text-xs">- $0/month, 1M operations, 3 seats</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Pro</code>
          <span className="text-neutral-11 text-xs">- $10/month, 10M operations, 10 seats</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Enterprise</code>
          <span className="text-neutral-11 text-xs">- Custom, unlimited, unlimited seats, SSO</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Stripe handles all payment processing</li>
        <li>PCI compliance via Stripe Elements</li>
        <li>Usage tracking for billing enforcement</li>
        <li>Graceful degradation when Stripe unavailable</li>
        <li>Prorated billing for mid-cycle changes</li>
        <li>Automatic invoice generation</li>
        <li>Failed payment retry logic</li>
        <li>Dunning management for failed payments</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components integrate with Stripe for billing and
        use GraphQL for subscription management. See actual usage in organization billing pages.
      </p>
    </div>
  </div>
);
