# AGENT TRUST PROTOCOL (Autonomy & Speed)

## 1. PURPOSE

To maximize development velocity by allowing agents to execute "safe" commands without explicit user permission, while maintaining a strict "Safety-First" policy for destructive actions.

## 2. AUTONOMY LEVELS

| Level | Name           | Description                                           | Permission Mode                             |
| ----- | -------------- | ----------------------------------------------------- | ------------------------------------------- |
| L0    | **Restricted** | Every command requires approval.                      | Always `SafeToAutoRun: false`               |
| L1    | **Pragmatic**  | (Default) Safe commands are auto-run; risky ones ask. | Context-driven `SafeToAutoRun`              |
| L2    | **Turbo**      | Agent is trusted for a specific task/slice.           | `// turbo` or `// turbo-all`                |
| L3    | **Autonomous** | Full freedom within a bounded context.                | User must explicitly grant via "Permit all" |

## 3. SAFE ZONE DEFINITIONS (SafeToAutoRun: true)

Agents are authorized to auto-run the following categories of commands:

### A. Read-Only Operations

- Directory listing (`ls`, `dir`, `list_dir`)
- File content viewing (`cat`, `type`, `Get-Content`, `view_file`)
- Searching (`grep`, `Select-String`, `find`)
- System status (`git status`, `netstat`, `npm run status`)

### B. Non-Destructive Git

- Staging changes (`git add .`)
- Comparing code (`git diff`)
- Checking branch info (`git branch`, `git log`)

### C. Validation & Testing

- Running tests (`npm test`, `pytest`, `npx playwright test`)
- Linting (`eslint`, `pylint`, `black --check`)
- Type checking (`tsc`, `mypy`)
- Building (`npm run build`, `vite build`)

### D. Environment Management

- Activating venvs (`.\venv\Scripts\activate`)
- Cleaning ports (`node scripts/cleanup-databiz-ports.js`)
- Viewing logs (`Get-Content logfile -Wait`)

## 4. RESTRICTED ZONE (SafeToAutoRun: false)

Approval is **MANDATORY** for:

- **Destructive Actions**: `rm`, `Remove-Item`, `git reset --hard`, `git clean -fd`.
- **System Mutations**: `pip install`, `npm install`, `apt-get`, editing system configs.
- **External Network Requests**: `curl` to unknown domains (except health checks to localhost).
- **Data Deletion**: `DROP TABLE`, `DELETE FROM` (without a very specific context).
- **Final Delivery**: `git push origin main` (staging/dev pushes may be L2).

## 5. USER TRIGGERS

Users can increase autonomy in chat:

- `// turbo` - Auto-run next command.
- `// turbo-all` - Auto-run all safe commands for this specific task.
- "You have L2 autonomy for this implementation" - General grant.

## 6. SELF-CORRECTION

If an auto-run command fails or produces unexpected results, the agent MUST immediately revert to L0 (ask for everything) until the situation is explained and resolved.
