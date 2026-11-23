"""Lesson 8: a ticket queue view.

Print the tickets that still need someone (status open or pending), oldest first,
one per line, like this:

    #1188 [urgent] Card declined but we were charged (opened 2026-10-27)

Run it from the workspace folder:   python lesson8/queue.py
"""

TICKETS = [
    {"id": 1190, "subject": "How do I add a logo to invoices", "priority": "low", "status": "solved", "created_at": "2026-10-27T15:02:00Z"},
    {"id": 1193, "subject": "Reminder emails going to spam", "priority": "normal", "status": "open", "created_at": "2026-10-28T09:40:00Z"},
    {"id": 1188, "subject": "Card declined but we were charged", "priority": "urgent", "status": "pending", "created_at": "2026-10-27T11:15:00Z"},
    {"id": 1197, "subject": "Can two people edit one invoice", "priority": "low", "status": "open", "created_at": "2026-10-29T16:20:00Z"},
    {"id": 1185, "subject": "Zapier says our key is invalid", "priority": "high", "status": "open", "created_at": "2026-10-26T08:05:00Z"},
    {"id": 1191, "subject": "Change billing email", "priority": "normal", "status": "closed", "created_at": "2026-10-27T17:30:00Z"},
    {"id": 1199, "subject": "Export button does nothing", "priority": "high", "status": "open", "created_at": "2026-10-30T10:12:00Z"},
    {"id": 1186, "subject": "Tax shows twice on PDF", "priority": "normal", "status": "solved", "created_at": "2026-10-26T13:44:00Z"},
]


def needs_someone(ticket):
    """True if the ticket's status is open or pending."""
    # TODO: return True or False
    return False


def queue_line(ticket):
    """One line of the queue, like '#1188 [urgent] Card declined but we were charged (opened 2026-10-27)'."""
    # TODO: an f-string. The date is the first 10 characters of created_at.
    return ""


def main():
    waiting = []
    # TODO: loop over TICKETS and append the ones that need someone to waiting

    # Oldest first. sort() puts a list in order; key= says what to sort by.
    waiting.sort(key=lambda ticket: ticket["created_at"])

    print(f"{len(waiting)} tickets waiting")
    # TODO: print queue_line(...) for each waiting ticket


main()
