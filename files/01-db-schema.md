# DB Schema & Migrations
Label: wayfinder:task

## Question
Produce the full MySQL schema (tables, columns, types, keys, indexes, relations) for: users (single-profile + Admin/Standard role + PIN hash + recovery-code hash), tasks, subtasks, schedule_rules (site/mode/window/failsafe-toggle), focus_sessions, accountability_log (deletions/missed-deadlines/forwards/focus-stops), and the sites/domain-bundle reference table. Plus the MongoDB collection shapes for the landing page (analytics events, waitlist emails, visitor/download logs). Include migration order and any seed data (default tags, default sites.json bundle).
