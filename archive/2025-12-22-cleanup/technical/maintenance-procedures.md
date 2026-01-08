# Maintenance Procedures - PIM System

**Last Updated**: 4 november 2025  
**Version**: 1.0  
**Owner**: Development Team

---

## 📋 Table of Contents

1. [Daily Maintenance](#daily-maintenance)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Maintenance](#monthly-maintenance)
4. [Quarterly Maintenance](#quarterly-maintenance)
5. [Emergency Procedures](#emergency-procedures)
6. [Database Cleanup](#database-cleanup)
7. [Performance Monitoring](#performance-monitoring)

---

## Daily Maintenance

### 🔄 Automated Tasks (via Supabase Cron)

#### 1. Cleanup Temporary Import Data
**Frequency**: Daily at 02:00 AM  
**Function**: `cleanup-old-temp-data`  
**Purpose**: Remove temp staging data >24 hours old

**Configuration** (Run once in Supabase SQL Editor):
```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup-old-temp-data (daily at 02:00 AM)
SELECT cron.schedule(
  'cleanup-temp-data-daily',
  '0 2 * * *', -- 02:00 AM daily
  $$
  SELECT net.http_post(
    url := 'https://pljdzwqnhqhrmtuzxnjg.supabase.co/functions/v1/cleanup-old-temp-data',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsamR6d3FuaHFocm10dXp4bmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDU3NDYsImV4cCI6MjA3NjIyMTc0Nn0.hnkcYLVHJ3rP8C4Z_2-BWaaZXuxJFoxR_3KLqp_9AVY"}'::jsonb
  ) as request_id;
  $$
);
```

**Verify Cron Jobs**:
```sql
-- Check scheduled jobs:
SELECT * FROM cron.job;

-- Check execution history:
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**Manual Execution** (for testing):
```sql
-- Trigger cleanup manually via Lovable AI:
-- Call edge function: cleanup-old-temp-data
```

**Monitoring**:
```sql
-- Check temp data accumulation:
SELECT COUNT(*) as temp_rows, 
       MIN(created_at) as oldest,
       pg_size_pretty(SUM(pg_column_size(raw_data))) as estimated_size
FROM supplier_datasets 
WHERE is_temp = true;

-- Alert if >1000 temp rows accumulated
```

**Expected Results**:
- Temp datasets deleted: 0-1000 rows
- Disk space freed: 0-100 MB
- Orphaned errors cleaned: 0-50 rows

#### 2. Archive Old Error Logs
**Frequency**: Daily at 03:00 AM  
**Function**: `archive-old-errors`  
**Purpose**: Archive error logs >30 days to `import_job_errors_archive` table

**Configuration** (Run once in Supabase SQL Editor):
```sql
-- Schedule archive-old-errors (daily at 03:00 AM)
SELECT cron.schedule(
  'archive-old-errors-daily',
  '0 3 * * *', -- 03:00 AM daily
  $$
  SELECT net.http_post(
    url := 'https://pljdzwqnhqhrmtuzxnjg.supabase.co/functions/v1/archive-old-errors',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsamR6d3FuaHFocm10dXp4bmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDU3NDYsImV4cCI6MjA3NjIyMTc0Nn0.hnkcYLVHJ3rP8C4Z_2-BWaaZXuxJFoxR_3KLqp_9AVY"}'::jsonb
  ) as request_id;
  $$
);
```

**Manual Verification**:
```sql
-- Check error log size:
SELECT pg_size_pretty(pg_total_relation_size('import_job_errors')) as current_size,
       pg_size_pretty(pg_total_relation_size('import_job_errors_archive')) as archive_size;

-- Count errors to be archived:
SELECT COUNT(*) as errors_to_archive
FROM import_job_errors
WHERE created_at < NOW() - INTERVAL '30 days';

-- View archived errors:
SELECT COUNT(*) as total_archived,
       MIN(created_at) as oldest,
       MAX(created_at) as newest
FROM import_job_errors_archive;
```

**Expected Results**:
- Errors archived: 0-500 rows
- Disk space freed: 0-5 MB
- Archive table growth: Gradual increase over time

---

## Weekly Maintenance

### Monday Morning Checklist (15 min)

#### 1. Security Scan
```bash
# Run Supabase linter via Lovable AI
supabase--linter

# Expected: 0 CRITICAL, 0 HIGH
# Review any new warnings
```

#### 2. Database Size Check
```sql
-- Check top 10 largest tables:
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 10;
```

**Alert Thresholds**:
- `supplier_datasets` >500 MB → Review cleanup policy
- `supplier_products` >1 GB → Normal growth, monitor
- `import_job_errors` >10 MB → Archive immediately

#### 3. Import Job Health
```sql
-- Check stuck imports (>5 minutes "in_progress"):
SELECT 
  id,
  file_name,
  status,
  started_at,
  NOW() - started_at AS duration
FROM import_supplier_dataset_jobs
WHERE status = 'in_progress'
  AND started_at < NOW() - INTERVAL '5 minutes'
ORDER BY started_at;
```

**Action**: Mark stuck jobs as 'failed' or retry

#### 4. User Activity Review
```sql
-- Check active users (last 7 days):
SELECT 
  u.email,
  ur.role,
  u.last_sign_in_at,
  NOW() - u.last_sign_in_at AS inactive_duration
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.is_active = true
ORDER BY u.last_sign_in_at DESC;
```

---

## Monthly Maintenance

### First Monday of Month (30 min)

#### 1. Performance Optimization Review
```sql
-- Find slow queries (via pg_stat_statements):
SELECT 
  queryid,
  LEFT(query, 80) AS short_query,
  calls,
  mean_exec_time,
  total_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000 -- >1 second
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Actions**:
- Add indexes for slow queries
- Consider materialized views
- Review batch size settings

#### 2. Dependency Updates
```bash
# Check for outdated packages:
npm outdated

# Update non-breaking changes:
npm update

# Review breaking changes:
# - React 18 → 19 (when stable)
# - Supabase JS client updates
# - Shadcn/ui component updates
```

#### 3. Backup Verification
```bash
# Verify Supabase auto-backups exist:
# Dashboard > Settings > Backups

# Test restore procedure (staging environment):
# 1. Create test import job
# 2. Trigger backup
# 3. Restore to new project
# 4. Verify data integrity
```

#### 4. Documentation Update
- Update `CHANGELOG.md` with monthly changes
- Review `README.md` for accuracy
- Update API docs if endpoints changed

---

## Quarterly Maintenance

### Q1, Q2, Q3, Q4 Tasks (2 hours)

#### 1. Security Audit
```bash
# Run comprehensive security scan:
npm audit

# Review Supabase security bulletins:
# https://supabase.com/docs/guides/platform/going-into-prod

# Check for SQL injection vulnerabilities:
# - All Edge Functions use query builder (no raw SQL)
# - All functions have SET search_path = public
# - All views use security_invoker = on
```

#### 2. Database Cleanup
```sql
-- Archive old inactive supplier products (>90 days):
SELECT cleanup_supplier_products(
  p_import_job_ids := NULL,
  p_file_status := 'INACTIVE',
  p_older_than_days := 90,
  p_dry_run := false -- Set true first to preview
);

-- Vacuum analyze all tables:
VACUUM ANALYZE;

-- Reindex for performance:
REINDEX DATABASE postgres;
```

#### 3. Performance Benchmarking
```sql
-- Benchmark import speed:
-- Target: 1000 rows/second mapping speed

SELECT 
  AVG((updated_count + inserted_count)::float / 
      EXTRACT(EPOCH FROM (completed_at - started_at))) AS rows_per_second
FROM import_supplier_dataset_jobs
WHERE status = 'completed'
  AND completed_at > NOW() - INTERVAL '3 months';
```

**Optimization Goals**:
- Import mapping: >1000 rows/sec
- Dataset activation: <30 seconds
- Supplier catalog page load: <2 seconds

#### 4. User Training Review
- Review user feedback
- Update training materials
- Schedule user training sessions

---

## Emergency Procedures

### 🚨 Database Connection Failure

**Symptom**: "Failed to connect to database"

**Immediate Actions**:
1. Check Supabase status: https://status.supabase.com
2. Verify connection string in `.env`
3. Check RLS policies (common cause of "permission denied")
4. Review recent migrations for breaking changes

**Rollback Procedure**:
```bash
# If recent migration caused issue:
# 1. Via Lovable AI: supabase--migration
# 2. Write rollback SQL
# 3. Test in staging first
# 4. Apply to production
```

### 🚨 Import Job Stuck

**Symptom**: Import shows "in_progress" >10 minutes

**Resolution**:
```sql
-- Mark as failed:
UPDATE import_supplier_dataset_jobs
SET status = 'failed',
    error_message = 'Import timed out - manually marked as failed',
    completed_at = NOW()
WHERE id = <job_id>
  AND status = 'in_progress'
  AND started_at < NOW() - INTERVAL '10 minutes';

-- Cleanup temp staging data:
DELETE FROM supplier_datasets
WHERE import_job_id = <job_id>
  AND is_temp = true;
```

### 🚨 Disk Space Alert

**Symptom**: Database >80% full

**Immediate Actions**:
```sql
-- Find largest tables:
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Emergency cleanup:
DELETE FROM supplier_datasets 
WHERE is_temp = true;

DELETE FROM import_job_errors 
WHERE created_at < NOW() - INTERVAL '30 days';
```

### 🚨 Performance Degradation

**Symptom**: Page load >5 seconds

**Diagnostics**:
```sql
-- Check active connections:
SELECT count(*) FROM pg_stat_activity 
WHERE state = 'active';

-- Check long-running queries:
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' 
  AND now() - query_start > INTERVAL '10 seconds'
ORDER BY duration DESC;

-- Kill slow query if needed:
SELECT pg_terminate_backend(<pid>);
```

---

## Database Cleanup

### Recommended Cleanup Schedule

| Task | Frequency | Retention | Impact |
|------|-----------|-----------|--------|
| Temp import data | Daily | 24 hours | High (124 MB freed) |
| Error logs | Weekly | 30 days | Medium (976 KB freed) |
| Inactive supplier products | Monthly | 90 days | Low (variable) |
| Old import jobs (ARCHIVED) | Quarterly | 180 days | Low (metadata only) |

### Manual Cleanup Commands

```sql
-- 1. Cleanup temp staging data (>24 hours):
SELECT * FROM cleanup_old_temp_data(); -- Returns deleted counts

-- 2. Archive old error logs:
INSERT INTO import_job_errors_archive 
SELECT * FROM import_job_errors 
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM import_job_errors 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 3. Delete old inactive supplier products (no VK-link):
SELECT cleanup_supplier_products(
  p_file_status := 'INACTIVE',
  p_older_than_days := 90,
  p_dry_run := true -- Preview first!
);

-- 4. Archive old import jobs:
UPDATE import_supplier_dataset_jobs
SET file_status = 'ARCHIVED'
WHERE file_status = 'INACTIVE'
  AND completed_at < NOW() - INTERVAL '180 days';
```

---

## Performance Monitoring

### Key Metrics Dashboard

#### Database Size Trend
```sql
-- Track over time (run monthly):
CREATE TABLE IF NOT EXISTS maintenance_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE DEFAULT CURRENT_DATE,
  total_db_size_mb NUMERIC,
  supplier_products_count BIGINT,
  supplier_datasets_count BIGINT,
  import_jobs_count BIGINT,
  active_users_count INT
);

INSERT INTO maintenance_metrics (
  total_db_size_mb,
  supplier_products_count,
  supplier_datasets_count,
  import_jobs_count,
  active_users_count
)
SELECT 
  pg_database_size(current_database())::numeric / (1024*1024),
  (SELECT COUNT(*) FROM supplier_products),
  (SELECT COUNT(*) FROM supplier_datasets),
  (SELECT COUNT(*) FROM import_supplier_dataset_jobs),
  (SELECT COUNT(*) FROM user_roles WHERE is_active = true);
```

#### Import Performance Trend
```sql
-- Average import speed last 30 days:
SELECT 
  DATE(started_at) AS import_date,
  COUNT(*) AS jobs_completed,
  AVG(total_rows) AS avg_rows,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_sec,
  AVG(total_rows / NULLIF(EXTRACT(EPOCH FROM (completed_at - started_at)), 0)) AS avg_rows_per_sec
FROM import_supplier_dataset_jobs
WHERE status = 'completed'
  AND started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY import_date DESC;
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Database size | >2 GB | >5 GB | Run cleanup |
| Import speed | <500 rows/sec | <100 rows/sec | Optimize queries |
| Error rate | >5% | >20% | Review validation |
| Temp data age | >1 day | >3 days | Manual cleanup |
| Stuck imports | >2 jobs | >5 jobs | Kill & retry |

---

## Contact & Escalation

**Primary Contact**: Development Team  
**Backup Contact**: Niels van Kruiningen  
**Emergency Contact**: security@vankruiningen.nl

**Escalation Path**:
1. Check this document for solution
2. Review `docs/technical/security-audit.md`
3. Consult Supabase docs: https://supabase.com/docs
4. Contact Supabase support (paid plan)

---

## Change Log

### 2025-11-04: v1.0 - Initial Version
- Created maintenance procedures
- Defined cleanup schedules
- Added emergency procedures
- Set performance benchmarks
