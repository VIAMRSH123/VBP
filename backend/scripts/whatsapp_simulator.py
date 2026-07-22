"""Mock Meta WhatsApp Business API simulator.

Sends sample WhatsApp messages (per Blueprint Appendix C) straight to the local
webhook endpoint, so the full ingestion pipeline can be exercised without a
real WhatsApp Business account. Run with the backend server already running:

    python scripts/whatsapp_simulator.py
    python scripts/whatsapp_simulator.py --message "Company: Acme Co Contact: Jane Doe Phone: +97455512345 Product: Cement Quantity: 50"
"""
import argparse
import sys

import httpx

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_ADMIN_EMAIL = "admin@company.com"
DEFAULT_ADMIN_PASSWORD = "Admin@123"

SAMPLE_MESSAGES = [
    (
        "+97450001111",
        "New Lead: Company: ABC Trading Contact: Ahmed Ali Phone: +97455512345 "
        "Product: Tissue Paper Quantity: 300",
    ),
    (
        "+97450002222",
        "New Lead: Company: Gulf Construction Co Contact: Fatima Noor Phone: +97455598765 "
        "Email: fatima@gulfconstruction.com Product: Cement Quantity: 500",
    ),
    (
        "+97450003333",
        "New Lead: Company: Doha Software Solutions Contact: Omar Khalid Phone: +97455511223 "
        "Product: Software License Quantity: 20",
    ),
]


def login(base_url: str, email: str, password: str) -> str:
    response = httpx.post(f"{base_url}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    response.raise_for_status()
    return response.json()["access_token"]


def send(base_url: str, token: str, from_phone: str, message: str) -> None:
    response = httpx.post(
        f"{base_url}/api/webhooks/whatsapp",
        json={"from_phone": from_phone, "message": message},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    print(f"-> {from_phone}: {message[:60]}...")
    print(f"   {response.json()}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--from-phone", default="+97450009999")
    parser.add_argument("--admin-email", default=DEFAULT_ADMIN_EMAIL)
    parser.add_argument("--admin-password", default=DEFAULT_ADMIN_PASSWORD)
    parser.add_argument("--message", help="Send a single custom message instead of the sample batch")
    args = parser.parse_args()

    token = login(args.base_url, args.admin_email, args.admin_password)

    if args.message:
        send(args.base_url, token, args.from_phone, args.message)
        return

    for phone, message in SAMPLE_MESSAGES:
        send(args.base_url, token, phone, message)

    print("Sample status update:")
    send(args.base_url, token, SAMPLE_MESSAGES[0][0], "Status Update: LeadID: L-10000 Status: Quote Sent Remarks: Follow-up Friday.")


if __name__ == "__main__":
    try:
        main()
    except httpx.HTTPStatusError as exc:
        print(f"Request failed: {exc.response.status_code} {exc.response.text}", file=sys.stderr)
        sys.exit(1)
    except httpx.ConnectError:
        print("Could not connect to backend. Is it running? (uvicorn app.main:app --reload)", file=sys.stderr)
        sys.exit(1)
