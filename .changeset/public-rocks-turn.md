---
'hive': minor
---

Add usage info to public API. This usage data can be requested using the operation:

```
query OrgUsage($orgReference: OrganizationReferenceInput!, $year: Int!, $month: Int!) {
    organization(reference: $orgReference) {
        isMonthlyOperationsLimitExceeded
        monthlyOperationsLimit
        usageRetentionInDays
        usageEstimation(input: { year: $year , month: $month }) {
            operations
        }
    }
}
```
