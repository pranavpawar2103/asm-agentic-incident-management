-- DESTRUCTIVE: removes all ticket and data quality data. Dev/test only.
DROP TABLE IF EXISTS dq_rule_matches;
DROP TABLE IF EXISTS dq_run_tickets;
DROP TABLE IF EXISTS dq_runs;
DROP TABLE IF EXISTS dq_rules;
DROP TABLE IF EXISTS servicenow_tickets;
