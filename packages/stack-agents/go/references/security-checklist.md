# Security Checklist

> Reference document for security-scanner. Loaded on demand via Read tool.

## Injection Prevention

### SQL Injection

**Always use parameterized queries. Never concatenate user input into SQL.**

```go
// CORRECT — parameterized
row := db.QueryRow(ctx,
    "SELECT id, name FROM users WHERE email = $1", email)

// CORRECT — IN clause with pgx
rows, err := db.Query(ctx,
    "SELECT id, name FROM users WHERE id = ANY($1)", ids)

// CRITICAL BUG — SQL injection
row := db.QueryRow(ctx,
    "SELECT id, name FROM users WHERE email = '" + email + "'")

// CRITICAL BUG — fmt.Sprintf with user input
query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", name)
```

### OS Command Injection

```go
// CRITICAL BUG — user input in exec.Command
cmd := exec.Command("sh", "-c", "convert "+userFilename+" output.png")

// CORRECT — separate arguments, no shell interpretation
cmd := exec.Command("convert", userFilename, "output.png")

// CORRECT — validate input before use
if !isValidFilename(userFilename) {
    return ErrInvalidFilename
}
cmd := exec.Command("convert", userFilename, "output.png")

// Validation function
func isValidFilename(name string) bool {
    // No path traversal, no shell metacharacters
    if strings.Contains(name, "..") || strings.ContainsAny(name, "/\\;|&$`") {
        return false
    }
    return regexp.MustCompile(`^[a-zA-Z0-9._-]+$`).MatchString(name)
}
```

### LDAP / XPath Injection

```go
// Escape special characters for LDAP queries
func ldapEscape(s string) string {
    replacer := strings.NewReplacer(
        `\`, `\5c`, `*`, `\2a`, `(`, `\28`,
        `)`, `\29`, "\x00", `\00`,
    )
    return replacer.Replace(s)
}

filter := fmt.Sprintf("(uid=%s)", ldapEscape(username))
```

## Crypto Best Practices

### Password Hashing

```go
import "golang.org/x/crypto/bcrypt"

// Hash password (cost 12 is a good default)
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(bytes), err
}

// Verify password
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

**Argon2 (preferred for new projects):**

```go
import "golang.org/x/crypto/argon2"

func HashPasswordArgon2(password string, salt []byte) []byte {
    return argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)
    // time=3, memory=64MB, threads=4, keyLen=32
}
```

### Random Number Generation

```go
// CORRECT — crypto/rand for security-sensitive values
import "crypto/rand"

func GenerateToken(length int) (string, error) {
    bytes := make([]byte, length)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(bytes), nil
}

func GenerateSecureID() (string, error) {
    id := make([]byte, 16)
    if _, err := rand.Read(id); err != nil {
        return "", err
    }
    return hex.EncodeToString(id), nil
}

// WRONG — math/rand for security (predictable!)
import "math/rand"
token := fmt.Sprintf("%d", rand.Int()) // INSECURE
```

### TLS Configuration

```go
tlsConfig := &tls.Config{
    MinVersion: tls.VersionTLS12,
    CipherSuites: []uint16{
        tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
        tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
        tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
        tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
        tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
        tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
    },
    PreferServerCipherSuites: true,
}

// WRONG — allows TLS 1.0/1.1
tlsConfig := &tls.Config{} // defaults allow old versions

// WRONG — disables certificate verification
tlsConfig := &tls.Config{InsecureSkipVerify: true}
```

## Web Security

### CORS

```go
func CORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
    originSet := make(map[string]bool)
    for _, o := range allowedOrigins {
        originSet[o] = true
    }

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            origin := r.Header.Get("Origin")
            if originSet[origin] {
                w.Header().Set("Access-Control-Allow-Origin", origin)
                w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
                w.Header().Set("Access-Control-Max-Age", "86400")
            }

            if r.Method == "OPTIONS" {
                w.WriteHeader(http.StatusNoContent)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

// WRONG — wildcard origin with credentials
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Credentials", "true") // conflict!
```

### Security Headers

```go
func SecurityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-XSS-Protection", "0") // modern browsers: disable, use CSP
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        w.Header().Set("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")
        w.Header().Set("Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload") // HSTS

        next.ServeHTTP(w, r)
    })
}
```

### Secure Cookies

```go
http.SetCookie(w, &http.Cookie{
    Name:     "session",
    Value:    sessionToken,
    Path:     "/",
    HttpOnly: true,  // no JavaScript access
    Secure:   true,  // HTTPS only
    SameSite: http.SameSiteStrictMode, // CSRF protection
    MaxAge:   3600,  // 1 hour
})

// WRONG — insecure cookie
http.SetCookie(w, &http.Cookie{
    Name:  "session",
    Value: sessionToken,
    // Missing: HttpOnly, Secure, SameSite
})
```

## Auth Patterns

### JWT Validation

```go
func ValidateJWT(tokenString string, publicKey *rsa.PublicKey) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{},
        func(token *jwt.Token) (any, error) {
            // Verify signing algorithm
            if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return publicKey, nil
        },
        jwt.WithValidMethods([]string{"RS256"}), // explicit allowed methods
        jwt.WithLeeway(5*time.Second),             // clock skew tolerance
    )
    if err != nil {
        return nil, fmt.Errorf("validate token: %w", err)
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, ErrInvalidToken
    }
    return claims, nil
}

// WRONG — no algorithm check (algorithm confusion attack)
token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
    return publicKey, nil // accepts ANY algorithm!
})
```

### Rate Limiting

```go
import "golang.org/x/time/rate"

type RateLimiter struct {
    mu       sync.Mutex
    limiters map[string]*rate.Limiter
}

func (rl *RateLimiter) Allow(key string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    limiter, ok := rl.limiters[key]
    if !ok {
        limiter = rate.NewLimiter(rate.Every(time.Second), 10) // 10 req/sec
        rl.limiters[key] = limiter
    }
    return limiter.Allow()
}
```

## Input Validation

### Boundary Validation

```go
func ValidateCreateUser(req *CreateUserRequest) error {
    var errs []error

    if len(req.Name) == 0 {
        errs = append(errs, fmt.Errorf("name: required"))
    } else if len(req.Name) > 100 {
        errs = append(errs, fmt.Errorf("name: max 100 characters"))
    }

    if !isValidEmail(req.Email) {
        errs = append(errs, fmt.Errorf("email: invalid format"))
    }

    if req.Age < 0 || req.Age > 150 {
        errs = append(errs, fmt.Errorf("age: must be 0-150"))
    }

    return errors.Join(errs...)
}
```

## File Upload Safety

```go
func HandleUpload(w http.ResponseWriter, r *http.Request) {
    // Size limit
    r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10MB max

    file, header, err := r.FormFile("file")
    if err != nil {
        respondError(w, http.StatusBadRequest, "invalid file")
        return
    }
    defer file.Close()

    // MIME type validation (read actual content, don't trust header)
    buf := make([]byte, 512)
    n, _ := file.Read(buf)
    mimeType := http.DetectContentType(buf[:n])

    allowedTypes := map[string]bool{
        "image/jpeg": true, "image/png": true, "image/webp": true,
    }
    if !allowedTypes[mimeType] {
        respondError(w, http.StatusBadRequest, "unsupported file type")
        return
    }

    // Reset reader
    file.Seek(0, io.SeekStart)

    // Path traversal prevention
    safeName := filepath.Base(header.Filename) // strip directory components
    if safeName == "." || safeName == "/" {
        respondError(w, http.StatusBadRequest, "invalid filename")
        return
    }

    // Save with generated name (never trust user filename)
    storedName := fmt.Sprintf("%s%s", uuid.New().String(), filepath.Ext(safeName))
    // ...
}
```

## When to Use

Apply when reviewing any code for security vulnerabilities. Flag violations as:
- **CRITICAL**: SQL injection, command injection, math/rand for security, InsecureSkipVerify, missing password hashing, wildcard CORS with credentials
- **WARNING**: Missing security headers, cookies without Secure/HttpOnly, no rate limiting, no input validation
- **SUGGESTION**: Could use Argon2 instead of bcrypt, add CSP headers, validate MIME types on upload
