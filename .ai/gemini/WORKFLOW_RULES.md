# Antigravity Workflow Rules

## 1. Task Management

Every non-trivial task should follow the Antigravity workflow:

1. `task_boundary` (PLANNING mode) -> Initialize `task.md`.
2. Research -> Update `task.md`.
3. Create `implementation_plan.md` -> `notify_user` for approval.
4. `task_boundary` (EXECUTION mode) -> Implement changes.
5. `task_boundary` (VERIFICATION mode) -> Create `walkthrough.md`.
6. `notify_user` -> Final delivery.

## 2. Tool Usage Best Practices

- **Search**: Prefer `grep_search` and `find_by_name` over manual directory traversal.
- **Read**: Use `view_file_outline` before `view_file` for large files.
- **Execute**: Always check `command_status` for background commands.

## 3. Communication Style

- Be concise.
- Use GitHub-style markdown.
- Batch multiple questions into a single `notify_user` call.
