"""Parses WaSenderAPI's "messages.received" webhook payload shape.

Reference shape:
{
  "event": "messages.received",
  "timestamp": 1633456789,
  "data": {
    "messages": {
      "key": {
        "id": "...",
        "fromMe": false,
        "remoteJid": "123456789@lid",
        "senderPn": "1234567890@s.whatsapp.net",
        "cleanedSenderPn": "1234567890"
      },
      "messageBody": "Hello, I have a question",
      "message": {"conversation": "Hello, I have a question"}
    }
  }
}

Wasender fires both "messages.received" and "messages-personal.received" for the same
1:1 message in practice, so both are accepted here — a duplicate delivery is caught by
the existing duplicate-detection stage in the pipeline rather than by this parser. Other
events (message.sent, messages.update/status callbacks, group messages) are ignored —
callers should only act on the returned list, which is empty for anything not extractable.
"""

_INBOUND_EVENTS = {"messages.received", "messages-personal.received"}


def extract_inbound_messages(payload: dict) -> list[dict]:
    """Returns a list of {"from_phone": str, "message": str, "sender_name": str} dicts."""
    if payload.get("event") not in _INBOUND_EVENTS:
        return []

    msg = payload.get("data", {}).get("messages")
    if not msg:
        return []

    key = msg.get("key", {})
    if key.get("fromMe"):
        return []  # echo of a message we sent ourselves, not an inbound lead

    from_phone = key.get("cleanedSenderPn", "")
    body = msg.get("messageBody", "")
    if not from_phone or not body:
        return []

    return [
        {
            "from_phone": f"+{from_phone}" if not from_phone.startswith("+") else from_phone,
            "message": body,
            "sender_name": "",
        }
    ]
