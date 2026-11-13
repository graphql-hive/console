---
'hive': patch
---

Schema checks and publishes no longer hide changes to a type, field, input field, union or directive
when a description, interface, union member, directive location or directive argument was added to
that same node in the same diff. The rule that collapses changes nested under a newly added node
treated those additions like the addition of the node itself, so for example a field's type change
next to a new description, or fields added to a type that gained an interface, were missing from the
list of changes. Such a change is now reported, and a check fails on it when it is breaking.
