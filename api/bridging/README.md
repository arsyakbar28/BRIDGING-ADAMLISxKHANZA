# Bridging API - Modular Structure

API bridging untuk integrasi SIMRS - LIS dengan struktur modular berdasarkan tipe laboratorium.

## 📁 Struktur Folder

```
api/bridging/
├── pk/                          # 🔬 Patologi Klinis
│   ├── controllers/             # HTTP request handlers
│   │   ├── patient-registration-pk.controller.js
│   │   ├── lab-results-pk.controller.js
│   │   └── post-lab-pk.controller.js
│   ├── services/                # Business logic
│   │   ├── patient-registration-pk.service.js
│   │   ├── lab-results-pk.service.js
│   │   └── post-lab-pk.service.js
│   ├── repositories/            # Database operations
│   │   ├── patient-pk.repository.js
│   │   ├── lab-pk.repository.js
│   │   └── post-lab-pk.repository.js
│   ├── validators/              # Validation logic
│   │   └── lab-results-pk.validator.js
│   └── routes.js                # PK routes
│
├── pa/                          # 🧬 Patologi Anatomi (Coming Soon)
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── routes.js
│
├── mb/                          # 🦠 Mikrobiologi (Coming Soon)
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── routes.js
│
├── shared/                      # 🔄 Shared utilities
│   ├── helpers/
│   │   ├── error-parser.helper.js      # Parse database errors
│   │   ├── response.helper.js          # Standardized responses
│   │   └── status-mapper.helper.js     # Map status codes
│   ├── validators/
│   │   ├── date-time.validator.js      # Date/time validation
│   │   └── common.validator.js         # Common validations
│   └── middleware/                      # Future middleware
│
└── routes.js                    # Main bridging routes aggregator
```

---

## 🏗️ Architecture Pattern

### Layer Separation (MVC-like)

```
Request → Router → Controller → Service → Repository → Database
                      ↓            ↓           ↓
                   Validation   Business    SQL Queries
                                 Logic
```

#### **Controller Layer**
- Handle HTTP requests/responses
- Input validation (basic)
- Call service layer
- Format responses using `responseHelper`

#### **Service Layer**
- Business logic orchestration
- Data validation (comprehensive)
- Transaction management
- Error handling with user-friendly messages

#### **Repository Layer**
- All SQL queries
- Database operations only
- No business logic
- Return raw data

#### **Validator Layer**
- Comprehensive input validation
- Format checking
- Data structure validation

---

## 🔬 PK (Patologi Klinis) Endpoints

**Note:** Endpoints tetap sama (backward compatible), struktur modular hanya di backend.

### 1. Search Patient Registration
```
GET /adam-lis/bridging/:limit/:noorder
```

**Example:**
```
GET /adam-lis/bridging/10/PK202511010004
```

### 2. Get Lab Results
```
GET /adam-lis/bridging/lab-results-pk/:limit/:noorder
```

**Example:**
```
GET /adam-lis/bridging/lab-results-pk/10/PK202511010004
```

### 3. Post Lab Results
```
POST /adam-lis/bridging/
```

**Body:**
```json
{
  "noorder": "PK202511010004",
  "pemeriksaan": [...],
  "dokter_pj": "D029",
  "petugas": "LAB007",
  "dokter_perujuk": "D018",
  "tgl_periksa": "2025-11-01",
  "jam_periksa": "16:00:38",
  "kesan": "-",
  "saran": "-"
}
```

---

## 🧬 PA & 🦠 MB (Coming Soon)

Folder structure sudah disiapkan untuk PA (Patologi Anatomi) dan MB (Mikrobiologi).

**To implement:**
1. Copy structure dari `pk/`
2. Adjust business logic sesuai kebutuhan PA/MB
3. Update routes
4. Test endpoints

---

## 🔄 Shared Utilities

### Error Parser Helper
```javascript
const errorParser = require('../shared/helpers/error-parser.helper');

// Parse database error to user-friendly message
const message = errorParser.parseDatabaseError(error, {
    petugas: 'LAB007',
    dokter_pj: 'D029'
});
```

### Response Helper
```javascript
const responseHelper = require('../shared/helpers/response.helper');

// Success response
responseHelper.success(res, "Data found", payload);

// Error responses
responseHelper.badRequest(res, "Invalid input");
responseHelper.notFound(res, "Data not found");
responseHelper.serverError(res, "Server error");
```

### Validators
```javascript
const { validateDateFormat, validateTimeFormat } = require('../shared/validators/date-time.validator');
const { validateRequired, validateArrayNotEmpty } = require('../shared/validators/common.validator');

// Validate date
const validation = validateDateFormat("2025-11-01");
if (!validation.valid) {
    console.log(validation.message);
}
```

---

## ✅ Benefits

| Benefit | Description |
|---------|-------------|
| 🎯 **Separation of Concerns** | Each layer has single responsibility |
| 🔄 **Reusability** | Shared helpers & validators |
| 🧪 **Testable** | Each layer can be tested independently |
| 📈 **Scalable** | Easy to add PA & MB |
| 👥 **Team Work** | Multiple developers can work in parallel |
| 🔍 **Maintainable** | Easy to find and fix bugs |
| 📚 **Clear Structure** | Intuitive folder organization |

---

## 🚀 Adding New Lab Type (PA/MB)

1. **Create controllers** in `pa/controllers/` or `mb/controllers/`
2. **Create services** in `pa/services/` or `mb/services/`
3. **Create repositories** in `pa/repositories/` or `mb/repositories/`
4. **Create validators** in `pa/validators/` or `mb/validators/`
5. **Update routes** in `pa/routes.js` or `mb/routes.js`
6. **Update main routes** in `routes.js`

---

## 🧪 Testing

```bash
# Start server
npm start

# Test PK endpoints
curl http://localhost:5000/adam-lis/bridging/pk/10/PK202511010004

# Check bridging info
curl http://localhost:5000/adam-lis/bridging
```

---

## 📝 Development Guidelines

### File Naming Convention
- Controllers: `{feature}-pk.controller.js`
- Services: `{feature}-pk.service.js`
- Repositories: `{feature}-pk.repository.js`
- Validators: `{feature}-pk.validator.js`

### Code Organization
- Keep controllers thin (< 100 lines)
- Put business logic in services
- Put SQL queries in repositories
- Use shared helpers for common functions

### Error Handling
- Use `errorParser.parseDatabaseError()` for database errors
- Use `responseHelper` for consistent responses
- Always log technical errors server-side
- Return user-friendly messages to clients

---

## 📚 Related Documentation

- `../../docs/VALIDATION-EXAMPLES.md` - Validation examples
- `../../docs/ERROR-MESSAGES.md` - Error message documentation
- `../../docs/POST-Lab-Results-API.md` - POST API details
- `../../API-Dokumentasi.md` - Main API documentation

---

## 🔧 Migration from Old Structure

Old files (for reference, will be archived):
- `get-patient-registration.js` → `pk/controllers/patient-registration-pk.controller.js` + service + repository
- `get-lab-results-pk.js` → `pk/controllers/lab-results-pk.controller.js` + service + repository
- `post-labpk-results.js` → `pk/controllers/post-lab-pk.controller.js` + service + repository + validator

**Breaking changes:** None! Routes updated to maintain backward compatibility.

