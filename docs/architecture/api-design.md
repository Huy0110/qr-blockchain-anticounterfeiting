# API Design — Coordination Hub

REST API style with OpenAPI 3.0 spec. Auto-generated at runtime via `@nestjs/swagger`; this document is the **design intent** that the runtime spec must match.

Spec output URL (dev/local): `http://localhost:3000/api/docs` (Swagger UI) and `http://localhost:3000/api/docs-json` (JSON).

---

## 1. Conventions

| Topic          | Rule                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Versioning     | URL prefix `/api/v1` (locked for v1; future v2 will fork)                                                |
| Authentication | `Authorization: Bearer <accessToken>` header (HS256 JWT)                                                 |
| Content-Type   | `application/json` for all body requests except multipart uploads                                        |
| Encoding       | UTF-8                                                                                                    |
| Date format    | ISO-8601 strings (e.g., `2026-04-30T13:45:00.000Z`)                                                      |
| ID format      | `phi` and `h` are bytes32 hex with `0x` prefix (66 chars total). MongoDB `_id` returned as `id` (string) |
| Pagination     | `?page=1&pageSize=20` (default 1/20; max pageSize 100)                                                   |
| Filtering      | `?status=in_progress`, `?vegetableType=rau-muong`                                                        |
| Sorting        | `?sort=createdAt:-1`                                                                                     |
| Error envelope | See §4                                                                                                   |
| Request ID     | `x-request-id` header (server-generated UUIDv7 if absent)                                                |
| Rate limit     | Per route (see [system-design.md](system-design.md) §3)                                                  |
| CORS           | Whitelist origins from `CORS_ORIGINS` env var                                                            |

---

## 2. OpenAPI 3.0 spec (excerpt — runtime spec is canonical)

```yaml
openapi: 3.0.3
info:
  title: qr-blockchain-anticounterfeiting Coordination Hub API
  version: 1.0.0
  description: |
    Hub API for the dual-QR anti-counterfeiting system.
    Paper: A Dual-QR Blockchain-Based Authentication Mechanism for Agricultural Anti-Counterfeiting (Frontiers in Blockchain).
  contact:
    name: Duc Huy Pham
    email: pham.duc.huy@sun-asterisk.com
  license:
    name: MIT
    identifier: MIT

servers:
  - url: http://localhost:3000/api/v1
    description: Local dev
  - url: https://hub.example.com/api/v1
    description: Production (future)

tags:
  - name: auth
    description: Producer authentication
  - name: producers
    description: Producer profile + wallet
  - name: projects
    description: Project metadata CRUD + on-chain registration
  - name: activities
    description: Cultivation activities (nested under project)
  - name: certifications
    description: Certifications (nested under project)
  - name: uploads
    description: Image / PDF uploads to IPFS
  - name: batches
    description: Batch QR generation
  - name: scan
    description: Public + private QR scanning (anonymous)
  - name: verifications
    description: Per-project verification log analytics
  - name: observability
    description: Health + metrics

paths:
  ##########  AUTH  ##########

  /auth/register:
    post:
      tags: [auth]
      summary: Register a new producer
      description: |
        Creates a producer account, generates a Polygon wallet server-side,
        encrypts the private key with AES-256-GCM, and returns access + refresh JWTs.
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RegisterRequest' }
      responses:
        '201':
          description: Producer created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '409':
          $ref: '#/components/responses/EmailExists'
        '400':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimited'

  /auth/login:
    post:
      tags: [auth]
      summary: Log in
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '401':
          $ref: '#/components/responses/InvalidCredentials'
        '423':
          $ref: '#/components/responses/AccountLocked'
        '429':
          $ref: '#/components/responses/RateLimited'

  /auth/refresh:
    post:
      tags: [auth]
      summary: Exchange refresh token for new access token
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RefreshRequest' }
      responses:
        '200':
          description: New access token
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '401':
          $ref: '#/components/responses/InvalidRefresh'

  ##########  PRODUCERS  ##########

  /producers/me:
    get:
      tags: [producers]
      summary: Own profile
      security:
        - BearerAuth: []
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProducerProfile' }
        '401':
          $ref: '#/components/responses/Unauthenticated'

  ##########  PROJECTS  ##########

  /projects:
    get:
      tags: [projects]
      summary: List own projects
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
        - $ref: '#/components/parameters/Sort'
        - in: query
          name: status
          schema: { type: string, enum: [in_progress, harvesting, finished] }
        - in: query
          name: q
          description: Free-text search (cooperativeName, vegetableType, description)
          schema: { type: string, maxLength: 200 }
      responses:
        '200':
          description: Paginated list
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProjectListResponse' }
        '401':
          $ref: '#/components/responses/Unauthenticated'

    post:
      tags: [projects]
      summary: Create project
      description: |
        Creates project metadata in MongoDB and submits `registerProject(phi)` on-chain.
        Hub auto-generates `phi` (bytes32 random) and verifies uniqueness on-chain before persisting.
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateProjectRequest' }
      responses:
        '201':
          description: Project created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProjectResponse' }
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '503':
          $ref: '#/components/responses/UpstreamUnavailable'

  /projects/{phi}:
    get:
      tags: [projects]
      summary: Get project (own or public)
      description: |
        Authenticated owner can always fetch.
        Anonymous fetch returns metadata only if `status` is `harvesting` or `finished`
        AND `projectExists(phi)` returns true on-chain.
      parameters:
        - $ref: '#/components/parameters/Phi'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProjectResponse' }
        '404':
          $ref: '#/components/responses/ProjectNotFound'

    patch:
      tags: [projects]
      summary: Update project metadata
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateProjectRequest' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProjectResponse' }
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/ProjectNotFound'

    delete:
      tags: [projects]
      summary: Soft-delete project
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      responses:
        '204':
          description: Soft-deleted
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/ProjectNotFound'

  ##########  ACTIVITIES  ##########

  /projects/{phi}/activities:
    post:
      tags: [activities]
      summary: Add cultivation activity
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CultivationActivity' }
      responses:
        '201':
          description: Activity added
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CultivationActivity' }
        '400':
          $ref: '#/components/responses/ValidationError'
        '403':
          $ref: '#/components/responses/Forbidden'

  /projects/{phi}/activities/{activityId}:
    patch:
      tags: [activities]
      summary: Edit activity
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
        - in: path
          name: activityId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CultivationActivity' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CultivationActivity' }
    delete:
      tags: [activities]
      summary: Remove activity
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
        - in: path
          name: activityId
          required: true
          schema: { type: string }
      responses:
        '204':
          description: Removed

  ##########  CERTIFICATIONS  ##########

  /projects/{phi}/certifications:
    post:
      tags: [certifications]
      summary: Add certification (with PDF upload)
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [name, issuer, issueDate, file]
              properties:
                name: { type: string, maxLength: 100 }
                issuer: { type: string, maxLength: 200 }
                issueDate: { type: string, format: date }
                expiryDate: { type: string, format: date }
                file:
                  type: string
                  format: binary
                  description: PDF certification file (max 10 MB)
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Certification' }
        '413':
          $ref: '#/components/responses/PayloadTooLarge'
        '415':
          $ref: '#/components/responses/UnsupportedMediaType'

  ##########  IMAGES  ##########

  /projects/{phi}/images:
    post:
      tags: [uploads]
      summary: Upload product images (multipart, ≤ 10 each, ≤ 10 MB each)
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                files:
                  type: array
                  items: { type: string, format: binary }
      responses:
        '201':
          description: Uploaded
          content:
            application/json:
              schema:
                type: object
                properties:
                  urls:
                    type: array
                    items: { type: string, format: uri }

  ##########  BATCHES  ##########

  /projects/{phi}/batches:
    post:
      tags: [batches]
      summary: Generate QR batch
      description: |
        Generates N CSPRNG sid_i, computes h_i = sha256(sid_i),
        submits `registerBatch(phi, [h_1..h_n])` on-chain via the producer's wallet,
        and returns a ZIP of N+1 PNG QR codes.
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [n]
              properties:
                n:
                  type: integer
                  minimum: 1
                  maximum: 500
                  example: 100
      responses:
        '200':
          description: ZIP file with QR PNGs + manifest.json
          content:
            application/zip:
              schema: { type: string, format: binary }
        '400':
          $ref: '#/components/responses/ValidationError'
        '503':
          $ref: '#/components/responses/UpstreamUnavailable'

    get:
      tags: [batches]
      summary: List batches for project
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: List
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/BatchSummary' }
                  page: { type: integer }
                  pageSize: { type: integer }
                  total: { type: integer }

  ##########  SCAN (anonymous)  ##########

  /scan/public/{phi}:
    get:
      tags: [scan]
      summary: Public QR scan — return project metadata after on-chain projectExists check
      security: []
      parameters:
        - $ref: '#/components/parameters/Phi'
      responses:
        '200':
          description: Project metadata
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PublicProjectMetadata' }
        '404':
          $ref: '#/components/responses/ProjectNotFound'

  /scan/private:
    post:
      tags: [scan]
      summary: Private QR scan — verify or redeem
      description: |
        Submits `redeemProduct(phi, sid)` via the system hot wallet.
        Performs a read-only `verifyProduct(phi, sha256(sid))` first to short-circuit
        invalid or already-redeemed scans without paying gas.
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [phi, sid]
              properties:
                phi:
                  type: string
                  pattern: '^0x[a-fA-F0-9]{64}$'
                sid:
                  type: string
                  pattern: '^0x[a-fA-F0-9]+$'
                  maxLength: 514
      responses:
        '200':
          description: Verification outcome
          content:
            application/json:
              schema: { $ref: '#/components/schemas/VerificationOutcome' }
        '400':
          $ref: '#/components/responses/ValidationError'
        '503':
          $ref: '#/components/responses/UpstreamUnavailable'

  ##########  VERIFICATIONS (analytics, owner only)  ##########

  /projects/{phi}/verifications:
    get:
      tags: [verifications]
      summary: Verification log analytics
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Phi'
        - in: query
          name: since
          schema: { type: string, format: date-time }
        - in: query
          name: until
          schema: { type: string, format: date-time }
      responses:
        '200':
          description: Aggregated stats + recent items
          content:
            application/json:
              schema:
                type: object
                properties:
                  counts:
                    type: object
                    properties:
                      AUTHENTIC: { type: integer }
                      ALREADY_VERIFIED: { type: integer }
                      COUNTERFEIT: { type: integer }
                  daily:
                    type: array
                    items:
                      type: object
                      properties:
                        date: { type: string, format: date }
                        AUTHENTIC: { type: integer }
                        ALREADY_VERIFIED: { type: integer }
                        COUNTERFEIT: { type: integer }
                  recent:
                    type: array
                    items: { $ref: '#/components/schemas/VerificationLogItem' }

  ##########  OBSERVABILITY  ##########

  /health:
    get:
      tags: [observability]
      summary: Liveness + readiness checks
      security: []
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/HealthStatus' }
        '503':
          description: At least one dependency unhealthy
          content:
            application/json:
              schema: { $ref: '#/components/schemas/HealthStatus' }

  /metrics:
    get:
      tags: [observability]
      summary: Prometheus exposition
      security: []
      responses:
        '200':
          description: Prometheus text format
          content:
            text/plain: {}

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    Phi:
      name: phi
      in: path
      required: true
      schema:
        type: string
        pattern: '^0x[a-fA-F0-9]{64}$'
        example: '0x9c2e8f8a3b...'
    Page:
      name: page
      in: query
      schema: { type: integer, minimum: 1, default: 1 }
    PageSize:
      name: pageSize
      in: query
      schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
    Sort:
      name: sort
      in: query
      schema: { type: string, default: 'createdAt:-1', example: 'createdAt:-1' }

  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string }
            message: { type: string }
            details: { type: object, additionalProperties: true }
            requestId: { type: string }

    RegisterRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email, maxLength: 254 }
        password:
          type: string
          minLength: 12
          maxLength: 128
          description: '≥12 chars, must contain ≥1 letter, ≥1 digit, ≥1 special'

    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }

    RefreshRequest:
      type: object
      required: [refreshToken]
      properties:
        refreshToken: { type: string }

    AuthResponse:
      type: object
      properties:
        accessToken: { type: string }
        refreshToken: { type: string }
        expiresIn: { type: integer, description: 'seconds' }
        producer: { $ref: '#/components/schemas/ProducerProfile' }

    ProducerProfile:
      type: object
      properties:
        id: { type: string }
        email: { type: string }
        walletAddress: { type: string, pattern: '^0x[a-fA-F0-9]{40}$' }
        createdAt: { type: string, format: date-time }

    CreateProjectRequest:
      type: object
      required:
        [
          cooperativeName,
          vegetableType,
          cultivationLocation,
          startDate,
          harvestDate,
          cultivationArea,
          expectedOutput,
        ]
      properties:
        cooperativeName: { type: string, maxLength: 200 }
        vegetableType: { type: string, maxLength: 100 }
        cultivationLocation: { $ref: '#/components/schemas/CultivationLocation' }
        startDate: { type: string, format: date }
        harvestDate: { type: string, format: date }
        cultivationArea: { type: number, minimum: 0 }
        expectedOutput: { type: number, minimum: 0 }
        description: { type: string, maxLength: 5000 }

    UpdateProjectRequest:
      allOf:
        - { $ref: '#/components/schemas/CreateProjectRequest' }
      description: All fields optional; PATCH semantics

    CultivationLocation:
      type: object
      required: [address, province]
      properties:
        address: { type: string, maxLength: 200 }
        province: { type: string, maxLength: 100 }
        coordinates:
          type: object
          properties:
            lat: { type: number, minimum: -90, maximum: 90 }
            lng: { type: number, minimum: -180, maximum: 180 }

    CultivationActivity:
      type: object
      required: [type, activityDate, name]
      properties:
        id: { type: string, readOnly: true }
        type:
          type: string
          enum: [land_preparation, planting, fertilizing, pest_control, harvesting, other]
        activityDate: { type: string, format: date }
        name: { type: string, maxLength: 100 }
        description: { type: string, maxLength: 2000 }
        materials:
          type: array
          items: { type: string, maxLength: 100 }
        note: { type: string, maxLength: 500 }

    Certification:
      type: object
      properties:
        id: { type: string, readOnly: true }
        name: { type: string, maxLength: 100 }
        issuer: { type: string, maxLength: 200 }
        issueDate: { type: string, format: date }
        expiryDate: { type: string, format: date }
        documentUrl: { type: string, format: uri }

    ProjectResponse:
      type: object
      properties:
        id: { type: string }
        projectId: { type: string, pattern: '^0x[a-fA-F0-9]{64}$' }
        cooperativeName: { type: string }
        vegetableType: { type: string }
        cultivationLocation: { $ref: '#/components/schemas/CultivationLocation' }
        startDate: { type: string, format: date }
        harvestDate: { type: string, format: date }
        cultivationArea: { type: number }
        expectedOutput: { type: number }
        description: { type: string }
        cultivationActivities:
          type: array
          items: { $ref: '#/components/schemas/CultivationActivity' }
        certifications:
          type: array
          items: { $ref: '#/components/schemas/Certification' }
        imageUrls:
          type: array
          items: { type: string, format: uri }
        status: { type: string, enum: [in_progress, harvesting, finished] }
        ownerProducerId: { type: string }
        txHashRegisterProject: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    ProjectListResponse:
      type: object
      properties:
        items:
          type: array
          items: { $ref: '#/components/schemas/ProjectResponse' }
        page: { type: integer }
        pageSize: { type: integer }
        total: { type: integer }

    PublicProjectMetadata:
      description: Same as ProjectResponse but excludes ownerProducerId and audit fields
      allOf:
        - { $ref: '#/components/schemas/ProjectResponse' }

    BatchSummary:
      type: object
      properties:
        id: { type: string }
        n: { type: integer }
        txHash: { type: string }
        status: { type: string, enum: [pending, confirmed, failed] }
        createdAt: { type: string, format: date-time }

    VerificationOutcome:
      oneOf:
        - type: object
          required: [status, txHash, eventArgs, verifiedAt]
          properties:
            status: { type: string, enum: [AUTHENTIC] }
            txHash: { type: string, pattern: '^0x[a-fA-F0-9]{64}$' }
            eventArgs:
              type: object
              properties:
                phi: { type: string }
                h: { type: string }
                producer: { type: string }
                timestamp: { type: integer }
            verifiedAt: { type: string, format: date-time }
        - type: object
          required: [status]
          properties:
            status: { type: string, enum: [ALREADY_VERIFIED] }
            previousTxHash: { type: string }
            previousVerifiedAt: { type: string, format: date-time }
        - type: object
          required: [status, message]
          properties:
            status: { type: string, enum: [COUNTERFEIT] }
            message: { type: string }

    VerificationLogItem:
      type: object
      properties:
        scannedAt: { type: string, format: date-time }
        outcome: { type: string, enum: [AUTHENTIC, ALREADY_VERIFIED, COUNTERFEIT] }
        txHash: { type: string }
        userAgentSummary: { type: string }

    HealthStatus:
      type: object
      properties:
        status: { type: string, enum: [ok, degraded] }
        uptimeSeconds: { type: integer }
        checks:
          type: object
          properties:
            mongo: { type: string, enum: [ok, fail] }
            rpc: { type: string, enum: [ok, fail] }
            ipfs: { type: string, enum: [ok, fail] }
            systemWallet:
              type: object
              properties:
                status: { type: string }
                balanceMatic: { type: string }

  responses:
    EmailExists:
      description: Email already registered
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    InvalidCredentials:
      description: Wrong email or password
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    AccountLocked:
      description: Account locked due to repeated failures
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    InvalidRefresh:
      description: Refresh token invalid/expired
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    Unauthenticated:
      description: Missing/invalid JWT
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    Forbidden:
      description: Action not permitted on this resource
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    ProjectNotFound:
      description: Project does not exist
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    ValidationError:
      description: Request body / query validation failed
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    PayloadTooLarge:
      description: File exceeds 10 MB
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    UnsupportedMediaType:
      description: File MIME not allowed
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    RateLimited:
      description: Too many requests
      headers:
        Retry-After: { schema: { type: integer } }
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    UpstreamUnavailable:
      description: Blockchain RPC / IPFS / DB unreachable
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
```

---

## 3. Common patterns

### Pagination

```
GET /projects?page=1&pageSize=20
```

Response includes `page`, `pageSize`, `total`. Always 1-indexed.

### Sort

```
GET /projects?sort=createdAt:-1
```

Suffix `:-1` for descending, `:1` for ascending. Multi-sort: `?sort=status:1,createdAt:-1`.

### Filter

```
GET /projects?status=harvesting&q=rau muống
```

### Conditional fetch / ETag (deferred to v2)

PATCH endpoints will eventually accept `If-Match: <updatedAt>` to detect concurrent edits. v1 uses last-write-wins with optimistic concurrency via Mongoose `__v`.

---

## 4. Error envelope (canonical)

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with phi=0x9c2e8f8a... does not exist",
    "details": { "phi": "0x9c2e8f8a..." },
    "requestId": "req_01HABCXYZ"
  }
}
```

Code catalog (frozen for v1):

| Code                     | HTTP | Notes                            |
| ------------------------ | ---- | -------------------------------- |
| `VALIDATION_ERROR`       | 400  | DTO failed Zod / class-validator |
| `UNAUTHENTICATED`        | 401  | missing/invalid JWT              |
| `INVALID_CREDENTIALS`    | 401  | login failure                    |
| `INVALID_REFRESH`        | 401  | refresh token invalid            |
| `ACCOUNT_LOCKED`         | 423  | too many failures                |
| `FORBIDDEN`              | 403  | resource ownership               |
| `NOT_FOUND`              | 404  | generic                          |
| `PROJECT_NOT_FOUND`      | 404  |                                  |
| `EMAIL_EXISTS`           | 409  | register conflict                |
| `PHI_EXISTS`             | 409  | (rare; hub auto-retries)         |
| `BATCH_TOO_LARGE`        | 400  | N > 500                          |
| `EMPTY_BATCH`            | 400  | N == 0                           |
| `DUPLICATE_PRODUCT_HASH` | 409  | bug — hashes collide             |
| `PAYLOAD_TOO_LARGE`      | 413  | upload > 10 MB                   |
| `UNSUPPORTED_MEDIA_TYPE` | 415  | not image/pdf                    |
| `RATE_LIMITED`           | 429  | throttler                        |
| `UPSTREAM_UNAVAILABLE`   | 503  | RPC / IPFS / Mongo down          |
| `UPSTREAM_TIMEOUT`       | 504  | tx confirmation timeout          |
| `INTERNAL_ERROR`         | 500  | unhandled                        |

---

## 5. Frontend type generation

After hub starts, `apps/coordination-hub/scripts/export-openapi.ts` writes `openapi.json` to `packages/shared/src/openapi.json`. Frontend can then run `pnpm --filter @qr-bc/shared gen:client` to generate typed client (with `openapi-typescript` or `orval`). Optional in v1; can hand-write fetcher with shared types if simpler.

---

## 6. Versioning strategy

- v1 is locked.
- Breaking changes go to `/api/v2/` (parallel deployment).
- Non-breaking additions OK on `/api/v1/`.
- Deprecation: announced in CHANGELOG + `Deprecation` header for ≥ 1 minor version before removal.
