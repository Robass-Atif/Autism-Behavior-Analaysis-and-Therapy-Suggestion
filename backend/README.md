# Backend API Documentation

Role-based authentication backend using Node.js, Express, and MongoDB Atlas.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file with your MongoDB Atlas credentials:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

### 3. Run the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

---

## API Endpoints

Base URL: `http://localhost:5000/api`

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if server is running |

---

### Authentication Routes

#### 1. Sign Up (Register)

**Endpoint:** `POST /api/auth/signup`

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"  // Optional: "user" | "admin" | "moderator" (default: "user")
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "token": "jwt_token_here"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

---

#### 2. Sign In (Login)

**Endpoint:** `POST /api/auth/signin`

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "token": "jwt_token_here"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

#### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

**Access:** Private (Requires Authentication)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Admin Only Routes

#### 4. Get All Users

**Endpoint:** `GET /api/auth/users`

**Access:** Private (Admin Only)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "user_id_1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "user_id_2",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### 5. Update User Role

**Endpoint:** `PUT /api/auth/users/:id/role`

**Access:** Private (Admin Only)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "role": "moderator"  // "user" | "admin" | "moderator"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "moderator",
    "isActive": true
  }
}
```

---

#### 6. Delete User

**Endpoint:** `DELETE /api/auth/users/:id`

**Access:** Private (Admin Only)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| `user` | Can access their own profile (`/me`) |
| `moderator` | Same as user (can be extended for moderation features) |
| `admin` | Full access: view all users, update roles, delete users |

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "msg": "Email is required",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Not authorized, no token provided"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "Role 'user' is not authorized to access this route"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Server error"
}
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── controllers/
│   │   └── authController.js   # Auth logic
│   ├── middleware/
│   │   └── auth.js         # JWT & role middleware
│   ├── models/
│   │   └── User.js         # User schema
│   ├── routes/
│   │   └── authRoutes.js   # API routes
│   ├── utils/
│   │   └── generateToken.js    # JWT generator
│   └── server.js           # Entry point
├── .env                    # Environment variables
├── .env.example            # Example env file
├── package.json
└── README.md
```

---

## Testing with cURL

### Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### Sign In
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Users (Admin)
```bash
curl -X GET http://localhost:5000/api/auth/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```
