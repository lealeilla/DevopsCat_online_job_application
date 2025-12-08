# Error Budget Policy

Purpose: define acceptable downtime and error budget for the service.

Example policy (monthly):
- Service Level Objective (SLO): 99.9% availability per calendar month.
- Error budget: 0.1% downtime per month.

Conversion:
- 0.1% of 30 days = 43.2 minutes/month allowed downtime.

Enforcement and Runbooks:
- If error budget usage exceeds 25% in a rolling window, schedule a post-mortem for minor incidents and throttled rollouts.
- If error budget usage exceeds 50%, freeze non-essential releases and prioritize reliability work.
- If error budget is exhausted (100%), block further feature releases until remediation and a post-incident review.

Monitoring & Alerting:
- Track SLI (successful requests / total requests) and report to dashboards.
- Create alerts at 90% and 100% of budget consumption thresholds.
