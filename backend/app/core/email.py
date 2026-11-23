"""Outgoing e-mail behind a tiny interface, so the provider can be chosen later
(configuration only, see EMAIL_BACKEND / SMTP_* settings)."""

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger("campushub.email")


@dataclass(frozen=True)
class Email:
    to: str
    subject: str
    body: str


# Messages "sent" with the memory backend (tests read them here).
outbox: list[Email] = []


def send_email(to: str, subject: str, body: str) -> None:
    settings = get_settings()
    message = Email(to, subject, body)
    if settings.email_backend == "memory":
        outbox.append(message)
    elif settings.email_backend == "console":
        logger.warning("E-mail to %s — %s\n%s", to, subject, body)
    else:
        msg = EmailMessage()
        msg["From"] = settings.email_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(msg)
