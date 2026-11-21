# McGill Corner API v1

Base path: `/api/v1`. Requests and responses use JSON. Send `Accept: application/json` and, for JSON bodies, `Content-Type: application/json`. Protected endpoints require `Authorization: Bearer <token>`.

## Authentication

### `POST /auth/register`

Creates an account and its profile, then returns a 30-day Sanctum bearer token. Required fields: `name`, `email`, `password`, `password_confirmation`. Passwords must be at least 12 characters and include upper/lowercase letters, a number, and a symbol. Email addresses are trimmed and normalized to lowercase.

```json
{
  "name": "Taylor Student",
  "email": "taylor@example.com",
  "password": "StrongPassword123!",
  "password_confirmation": "StrongPassword123!"
}
```

### `POST /auth/login`

Required fields: `email`, `password`. Login is limited to five attempts per minute for each normalized email and IP address. Invalid email/password combinations use the same `401` response.

### `GET /auth/me`

Returns the authenticated user's safe account, profile, and selected interests.

### `POST /auth/logout`

Revokes the current bearer token. Other tokens belonging to the same account remain valid.

Successful register/login responses use this shape (registration returns `201`, login `200`):

```json
{
  "success": true,
  "message": "Signed in.",
  "data": {
    "token": "1|…",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "name": "Taylor Student",
      "email": "taylor@example.com",
      "profile": { "id": 1, "username": "taylorstudent-a1b2c3d4" },
      "interests": []
    }
  }
}
```

## Profile

All profile operations act on the authenticated user's own account; there is no client-supplied user ID.

### `GET /profile`

Returns the current user's account and profile.

### `PUT /profile`

Updates any supplied fields among `name`, `username`, `bio`, `university`, `program`, `year_of_study`, and `avatar_url`. Username must be 3–24 letters, digits, underscores, or hyphens and be unique. Bio is limited to 240 characters; year of study must be 1–8. Attempts to supply identifiers, email, password, role, XP, or privacy-mode fields are rejected.

```json
{
  "name": "Taylor Student",
  "username": "taylor_student",
  "program": "Computer Science",
  "year_of_study": 2,
  "bio": "Exploring Montreal"
}
```

## Interests

### `GET /interests`

Public catalog of interests.

### `GET /profile/interests`

Returns the authenticated user's selected interests.

### `PUT /profile/interests`

Replaces the current selection. `interests` must be an array of up to 30 distinct existing interest IDs. An empty array clears the selection.

```json
{ "interests": [2, 5, 9] }
```

## Errors

Validation failures return `422` with field-level messages:

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": { "email": ["The email field is required."] }
}
```

Unauthenticated protected requests return `401` with `{"success":false,"message":"Unauthenticated."}`. Bad credentials also return `401`; too many login attempts return `429`.

## Local development

From `backend/`, run `php artisan migrate`, then `php artisan serve`. The feature suite uses the configured test database; run it with `php artisan test`.

## Postman and curl

In Postman, set the request body to **raw → JSON**, add `Accept: application/json`, and use Bearer Token authorization for protected routes. The following commands work from the repository root after `php artisan serve` is running from `backend/`:

```sh
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"name":"Alex Chen","email":"alex@example.com","password":"StrongPassword123!","password_confirmation":"StrongPassword123!"}'

curl http://127.0.0.1:8000/api/v1/auth/me \
  -H 'Accept: application/json' -H 'Authorization: Bearer YOUR_TOKEN'

curl -X PUT http://127.0.0.1:8000/api/v1/profile/interests \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' -d '{"interests":[1,2,3]}'
```

Endpoint status codes: register `201` or validation `422`; login `200`, invalid credentials `401`, validation `422`, throttled `429`; logout/me/profile/selected interests `200` or unauthenticated `401`; public interests `200`; profile/interests updates `200`, validation `422`.
