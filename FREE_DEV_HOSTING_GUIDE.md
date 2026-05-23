# Cloud Snacks Free Dev Hosting

This setup hosts the backend away from your laptop for developmental testing.

## Recommended Free Stack

- Backend API: Render Free Web Service
- Database: Neon Free Postgres
- Mobile APK: rebuild with the Render HTTPS backend URL

The mobile app will work on any Wi-Fi or mobile data network once the APK points to the hosted backend URL.

## 1. Create Free Neon Database

1. Go to https://neon.com and create a free project.
2. Create a PostgreSQL database.
3. Copy the connection string.
4. Make sure the connection string includes SSL, usually `?sslmode=require`.

Example format:

```text
postgresql://user:password@host/dbname?sslmode=require
```

## 2. Deploy Backend On Render

1. Push this project to GitHub.
2. Go to https://render.com and create a free account.
3. Create a new Blueprint or Web Service from the GitHub repository.
4. Render can use the root `render.yaml` file in this project.
5. Set the required environment variable:

```text
DATABASE_URL=your_neon_postgres_connection_string
```

6. Optional OTP variables for real delivery:

```text
OTP_PRIMARY_CHANNEL=whatsapp
OTP_FALLBACK_CHANNEL=sms
OTP_ALLOW_DEV_FALLBACK=true
WHATSAPP_PROVIDER=webhook
WHATSAPP_WEBHOOK_URL=https://your-whatsapp-provider.example/send
WHATSAPP_WEBHOOK_TOKEN=optional_token
SMS_PROVIDER=fast2sms
FAST2SMS_API_KEY=your_fast2sms_key
```

For official Meta WhatsApp Cloud API instead of a provider webhook, set:

```text
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_TEMPLATE_NAME=your_approved_authentication_template_name
WHATSAPP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_GRAPH_API_VERSION=v20.0
WHATSAPP_INCLUDE_BUTTON_CODE=true
WHATSAPP_BUTTON_SUB_TYPE=url
```

For development without real OTP provider keys, keep:

```text
OTP_ALLOW_DEV_FALLBACK=true
```

## 3. Test Hosted Backend

After Render deploys, open:

```text
https://your-render-service.onrender.com/
```

Expected response:

```json
{"message":"Cloud Snacks Backend Running"}
```

## 4. Build APK For Hosted Backend

Once you have the Render URL, build the APK with:

```powershell
cd C:\Users\Juvvi\OneDrive\Documents\CloudSnacks\mobile-app
powershell -ExecutionPolicy Bypass -File .\build-apk.ps1 -BackendUrl https://your-render-service.onrender.com -OutputApkName cloudsnacks-hosted-dev.apk
```

Or from the repository root:

```powershell
cd C:\Users\Juvvi\OneDrive\Documents\CloudSnacks
powershell -ExecutionPolicy Bypass -File .\scripts\build-hosted-dev-apk.ps1 -BackendUrl https://your-render-service.onrender.com
```

Install `cloudsnacks-hosted-dev.apk` on the phone. It should work from any network.

## 5. Smoke Test Hosted Backend

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-hosted-backend.ps1 -BackendUrl https://your-render-service.onrender.com
```

This checks:

- backend home endpoint
- snack list endpoint
- OTP request endpoint and selected delivery channel

## Important Free Tier Notes

- Render free services can sleep when idle. The first request after sleep may take time.
- Neon free database limits are fine for development testing, not heavy production.
- Real WhatsApp/SMS OTP still needs provider setup and may cost money per OTP.
- This setup keeps the app portable for a later Google Cloud migration.
