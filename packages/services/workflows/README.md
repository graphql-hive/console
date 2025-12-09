# Workflow Service

Services for running asynchronous tasks and cron jobs. E.g. sending email, webhooks or other
maintenance/clen up tasks.

## Structure

```
# Definition of Webook Payload Models using zod
src/webhooks/*
# Task Definitions
src/tasks/*
# General lib
src/lib/*
```
