# Your workspace

Where you write the Python scripts from Lessons 7 to 15.

```bash
cd ~/Developer/support-skills/workspace
source ../.venv/bin/activate     # once per Terminal window
python -m pytest lesson12         # run a lesson's tests
python lesson12/log_report.py data/history.log
```

| Folder | Script | Tests |
|---|---|---|
| `lesson7/` | `first_script.py`: edit, save, run | none |
| `lesson8/` | `queue.py`: open and pending tickets, oldest first | none |
| `lesson10/` | `invoice_summary.py`: your first real script; `explore.ipynb`: a notebook | none |
| `lesson12/` | `log_report.py`: failures by endpoint from the request log | `test_log_report.py` |
| `lesson13/` | `overdue_report.py`: overdue invoices from the API, every page, with retries | `test_overdue_report.py` |
| `lesson14/` | `export_followup.py`: bulk reply, tag and update help desk tickets, safely | `test_export_followup.py` |
| `lesson15/` | `stuck_invites.py`, `revoked_keys.py`, `clean_import.py`, `sla_alert.py` | one test file each |

- `data/` holds the input files (a copy of the logs, an invoice export, a messy contact
  import). `npm run reset` regenerates it.
- Scripts write their results to `out/`.
- Reference solutions are in `../course/solutions/`. Try first.

Environment variables the scripts read:

```bash
export PAPERKITE_API_KEY=pk_test_harbor_reporting_7d2f   # Lesson 13
export HELPDESK_TOKEN=hd_test_support_team               # Lessons 14 and 15
```
