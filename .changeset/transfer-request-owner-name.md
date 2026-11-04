---
'hive': patch
---

Fix accepting an organization ownership transfer as a member whose role lacks the "View members"
permission. The transfer page showed "No access (reason: Missing permission for performing
'member:describe' on resource)" instead of the accept prompt.
