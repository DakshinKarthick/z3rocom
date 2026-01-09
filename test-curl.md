# Testing the Issue Classifier API

## Using PowerShell (Recommended for Windows)

```powershell
# Simple test
$body = '{"text":"Database connection pool exhausted. Production is down. Users cannot access the system."}'
Invoke-RestMethod -Uri "http://localhost:3000/api/issues/classify" -Method POST -Body $body -ContentType "application/json"

# With full output
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/issues/classify" -Method POST -Body $body -ContentType "application/json"
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

## Using curl (Windows CMD or Git Bash)

```bash
curl -X POST http://localhost:3000/api/issues/classify ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Database connection pool exhausted. Production is down. Users cannot access the system.\"}"
```

## Using curl (PowerShell - requires curl.exe)

```powershell
curl.exe -X POST http://localhost:3000/api/issues/classify `
  -H "Content-Type: application/json" `
  -d '{\"text\":\"Database connection pool exhausted. Production is down. Users cannot access the system.\"}'
```

## Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/issues/classify`
3. **Headers:**
   - Key: `Content-Type`
   - Value: `application/json`
4. **Body (raw JSON):**
```json
{
  "text": "Database connection pool exhausted. Production is down. Users cannot access the system."
}
```

## Expected Response

```json
{
  "priority": "high",
  "priority_confidence": 0.9928731038063948,
  "tags": ["database", "server", "backend"],
  "all_tag_scores": {
    "database": 0.9665628242344322,
    "server": 0.47887498743000817,
    "backend": 0.3557081581206064
  },
  "text": "Database connection pool exhausted. Production is down. Users cannot access the system."
}
```

## Troubleshooting

- **405 Method Not Allowed** - You're using GET instead of POST
- **Connection refused** - Dev server not running (run `pnpm run dev` in client folder)
- **CORS errors** - Already fixed with `Access-Control-Allow-Origin: *` header
