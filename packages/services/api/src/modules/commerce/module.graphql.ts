import { gql } from 'graphql-modules';

export default gql`
  extend type Organization {
    plan: BillingPlanType!
    billingConfiguration: BillingConfiguration!
    viewerCanDescribeBilling: Boolean!
    viewerCanModifyBilling: Boolean!
    rateLimit: RateLimit! @deprecated(reason: "All subfields moved to Organization")

    """
    Whether or not the monthly operations limit is currently exceeded.
    For hobby and pro plans, once the limit is exceeded, operation usage data received from the organization will be ignored.
    Enterprise plans will continue to have their usage data ingested.
    """
    isMonthlyOperationsLimitExceeded: Boolean! @tag(name: "public")

    """
    The monthly limit for number of operations ingested.
    For hobby and pro plans, once this limit is exceeded, operation usage data received from the organization will be ignored.
    Enterprise plans will continue to have their usage data ingested.
    """
    monthlyOperationsLimit: SafeInt! @tag(name: "public")

    """
    The configured retention for usage information, in days. Retention impacts how long data is stored.
    """
    usageRetentionInDays: Int! @tag(name: "public")

    """
    An approximation of the current monthly operation usage. This is based on how many operations have
    been successfully ingested by Hive, which is an asynchronous process.
    """
    usageEstimation(input: OrganizationUsageEstimationInput!): UsageEstimation @tag(name: "public")
  }

  input OrganizationUsageEstimationInput {
    year: Int!
    month: Int!
  }

  type BillingConfiguration {
    hasActiveSubscription: Boolean!
    canUpdateSubscription: Boolean!
    hasPaymentIssues: Boolean!
    paymentMethod: BillingPaymentMethod
    billingAddress: BillingDetails
    invoices: [BillingInvoice!]
    upcomingInvoice: BillingInvoice
  }

  type BillingInvoice {
    id: ID!
    amount: Float!
    date: DateTime!
    periodStart: DateTime!
    periodEnd: DateTime!
    pdfLink: String
    status: BillingInvoiceStatus!
  }

  enum BillingInvoiceStatus {
    DRAFT
    OPEN
    PAID
    VOID
    UNCOLLECTIBLE
  }

  type BillingPaymentMethod {
    brand: String!
    last4: String!
    expMonth: Int!
    expYear: Int!
  }

  type BillingDetails {
    city: String
    country: String
    line1: String
    line2: String
    postalCode: String
    state: String
  }

  extend type Query {
    billingPlans: [BillingPlan!]!
    usageEstimation(input: UsageEstimationInput!): UsageEstimation!
  }

  type BillingPlan {
    id: ID!
    planType: BillingPlanType!
    name: String!
    description: String
    basePrice: Float
    includedOperationsLimit: SafeInt
    pricePerOperationsUnit: Float
    rateLimit: UsageRateLimitType!
    retentionInDays: Int!
  }

  enum UsageRateLimitType {
    MONTHLY_QUOTA
    MONTHLY_LIMITED
    UNLIMITED
  }

  enum BillingPlanType {
    HOBBY
    PRO
    ENTERPRISE
  }

  extend type Mutation {
    generateStripePortalLink(selector: OrganizationSelectorInput!): String!
    upgradeToPro(input: UpgradeToProInput!): ChangePlanResult!
    downgradeToHobby(input: DowngradeToHobbyInput!): ChangePlanResult!
    updateOrgRateLimit(
      selector: OrganizationSelectorInput!
      monthlyLimits: RateLimitInput!
    ): Organization!
  }

  input DowngradeToHobbyInput {
    organization: OrganizationSelectorInput!
  }

  input UpgradeToProInput {
    organization: OrganizationSelectorInput!
    paymentMethodId: String
    couponCode: String
    monthlyLimits: RateLimitInput!
  }

  type ChangePlanResult {
    previousPlan: BillingPlanType!
    newPlan: BillingPlanType!
    organization: Organization!
  }

  type RateLimit {
    limitedForOperations: Boolean!
      @deprecated(reason: "Use Organization.isMonthlyOperationsLimitExceeded")
    operations: SafeInt! @deprecated(reason: "Use Organization.monthlyOperationsLimit")
    retentionInDays: Int! @deprecated(reason: "Use Organization.usageRetentionInDays")
  }

  input RateLimitInput {
    operations: SafeInt!
  }

  input UsageEstimationInput {
    year: Int!
    month: Int!
    organizationSlug: String!
  }

  type UsageEstimation {
    operations: SafeInt!
  }
`;
