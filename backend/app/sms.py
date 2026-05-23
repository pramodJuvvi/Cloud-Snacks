import json
import os
from urllib import parse, request


class SmsDeliveryError(RuntimeError):
    pass


def normalize_indian_sms_number(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        return digits[-10:]
    return digits


def normalize_whatsapp_number(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    return digits


def post_json(url: str, payload: dict, headers: dict[str, str], timeout: int = 10) -> None:
    outbound_request = request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers=headers,
        method="POST",
    )
    with request.urlopen(outbound_request, timeout=timeout) as response:
        if response.status >= 400:
            raise SmsDeliveryError(f"Provider failed with status {response.status}")


def send_otp_sms(phone: str, otp: str) -> str:
    provider = os.getenv("SMS_PROVIDER", "dev").strip().lower()
    message = f"Your Cloud Snacks OTP is {otp}. It expires in 5 minutes."

    if provider in {"", "dev", "local"}:
        return "dev"

    if provider == "fast2sms":
        api_key = os.getenv("FAST2SMS_API_KEY", "").strip()
        if not api_key:
            raise SmsDeliveryError("FAST2SMS_API_KEY is not configured")

        payload = parse.urlencode(
            {
                "route": "otp",
                "variables_values": otp,
                "numbers": normalize_indian_sms_number(phone),
            }
        ).encode()
        sms_request = request.Request(
            "https://www.fast2sms.com/dev/bulkV2",
            data=payload,
            headers={
                "authorization": api_key,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        with request.urlopen(sms_request, timeout=10) as response:
            if response.status >= 400:
                raise SmsDeliveryError(f"Fast2SMS failed with status {response.status}")
        return "sms"

    if provider == "webhook":
        webhook_url = os.getenv("SMS_WEBHOOK_URL", "").strip()
        if not webhook_url:
            raise SmsDeliveryError("SMS_WEBHOOK_URL is not configured")

        token = os.getenv("SMS_WEBHOOK_TOKEN", "").strip()
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        sms_request = request.Request(
            webhook_url,
            data=json.dumps({"to": phone, "message": message, "otp": otp}).encode(),
            headers=headers,
            method="POST",
        )
        with request.urlopen(sms_request, timeout=10) as response:
            if response.status >= 400:
                raise SmsDeliveryError(f"SMS webhook failed with status {response.status}")
        return "sms"

    raise SmsDeliveryError(f"Unsupported SMS_PROVIDER: {provider}")


def send_otp_whatsapp(phone: str, otp: str) -> str:
    provider = os.getenv("WHATSAPP_PROVIDER", "").strip().lower()
    message = f"Your Cloud Snacks OTP is {otp}. It expires in 5 minutes."

    if provider in {"", "none", "disabled"}:
        raise SmsDeliveryError("WHATSAPP_PROVIDER is not configured")

    if provider == "webhook":
        webhook_url = os.getenv("WHATSAPP_WEBHOOK_URL", "").strip()
        if not webhook_url:
            raise SmsDeliveryError("WHATSAPP_WEBHOOK_URL is not configured")

        token = os.getenv("WHATSAPP_WEBHOOK_TOKEN", "").strip()
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        post_json(
            webhook_url,
            {
                "channel": "whatsapp",
                "to": normalize_whatsapp_number(phone),
                "message": message,
                "otp": otp,
                "purpose": "authentication",
            },
            headers,
        )
        return "whatsapp"

    if provider == "meta":
        access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
        phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
        template_name = os.getenv("WHATSAPP_TEMPLATE_NAME", "cloud_snacks_otp").strip()
        template_language = os.getenv("WHATSAPP_TEMPLATE_LANGUAGE", "en_US").strip()
        graph_api_version = os.getenv("WHATSAPP_GRAPH_API_VERSION", "v20.0").strip()
        button_sub_type = os.getenv("WHATSAPP_BUTTON_SUB_TYPE", "url").strip()
        include_button_code = os.getenv("WHATSAPP_INCLUDE_BUTTON_CODE", "true").strip().lower() in {
            "1",
            "true",
            "yes",
        }
        if not access_token or not phone_number_id:
            raise SmsDeliveryError("WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured")

        components = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": otp}],
            }
        ]
        if include_button_code:
            components.append(
                {
                    "type": "button",
                    "sub_type": button_sub_type,
                    "index": "0",
                    "parameters": [{"type": "text", "text": otp}],
                }
            )

        post_json(
            f"https://graph.facebook.com/{graph_api_version}/{phone_number_id}/messages",
            {
                "messaging_product": "whatsapp",
                "to": normalize_whatsapp_number(phone),
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": template_language},
                    "components": components,
                },
            },
            {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        return "whatsapp"

    raise SmsDeliveryError(f"Unsupported WHATSAPP_PROVIDER: {provider}")


def send_otp_code(phone: str, otp: str) -> str:
    primary_channel = os.getenv("OTP_PRIMARY_CHANNEL", "whatsapp").strip().lower()
    fallback_channel = os.getenv("OTP_FALLBACK_CHANNEL", "sms").strip().lower()
    allow_dev_fallback = os.getenv("OTP_ALLOW_DEV_FALLBACK", "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    errors: list[str] = []

    for channel in [primary_channel, fallback_channel]:
        if channel in {"", "none", "disabled"}:
            continue
        try:
            if channel == "whatsapp":
                return send_otp_whatsapp(phone, otp)
            if channel == "sms":
                return send_otp_sms(phone, otp)
            if channel == "dev":
                return "dev"
            raise SmsDeliveryError(f"Unsupported OTP channel: {channel}")
        except SmsDeliveryError as error:
            errors.append(f"{channel}: {error}")

    if allow_dev_fallback:
        return "dev"

    raise SmsDeliveryError("; ".join(errors) or "No OTP delivery channel is configured")
