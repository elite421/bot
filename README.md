# ReverseOTP - QR Code Authentication System

A modern, secure authentication system that uses QR codes for login verification, inspired by www.reverseotp.com. Users scan a QR code with their phone, receive a hash code via WhatsApp/SMS, and send it to the company number to complete authentication.

## ⚡ Vercel Deployment (Quick)

This app is a unified Next.js app (frontend + API). Deploying to Vercel is the recommended path.

1) Set these Environment Variables in Vercel (Project Settings → Environment Variables):

```
NEXT_PUBLIC_API_URL=/api
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate_a_strong_secret
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
JWT_SECRET=another_strong_secret

# Optional (only if you run the WhatsApp bot somewhere reachable from the internet)
BOT_SERVICE_URL=https://your-bot-host:4002
BOT_INTERNAL_KEY=dev-secret-key
COMPANY_WHATSAPP_NUMBER=+1234567890

# Optional (payments)
NEXT_PUBLIC_PAYMENT_LINK_URL=
PAYMENT_LINK_URL=
```

2) Import the repo in Vercel Dashboard and deploy (Framework auto-detected: Next.js). No custom vercel.json needed.

3) Post-deploy checks:

- Hit `GET https://your-domain.vercel.app/api/auth/me` with a valid Bearer token to verify API works
- App pages load and login works
- Admin features that use NextAuth require `NEXTAUTH_URL` and `NEXTAUTH_SECRET`

4) If the Vercel CLI shows a network error like:

```
Invalid argument: protocol error: incomplete envelope: read tcp ...:443: read: can't assign requested address
```

- This is a local network issue (ephemeral port/NAT/proxy). Workarounds:
  - Use the Vercel Dashboard (web) to deploy instead of CLI
  - Or build locally then deploy prebuilt: `npx vercel build` → `npx vercel deploy --prebuilt`
  - Or run `npx vercel --debug` and try another network/VPN

For more details and production notes, see `deployment-guide.md` (the cPanel sections are legacy and can be ignored for Vercel).

## 🗄️ Railway PostgreSQL (Quick Start)

Use a managed Postgres on Railway and point the Next.js app to it directly (no Prisma required).

1) Create a PostgreSQL service on Railway.

2) Copy the External connection URL and set it as `DATABASE_URL`:

   - Local: `.env.local` → `DATABASE_URL=postgresql://.../db?sslmode=require`
   - Vercel Project Settings → Environment Variables → `DATABASE_URL`

3) Initialize tables once using `db/schema.sql`:

   - From your machine (psql):
     ```bash
     psql "${DATABASE_URL}" -f db/schema.sql
     ```
   - Or run the SQL in Railway’s Postgres SQL Console.

4) Deploy or run locally. All API routes use `pg` via `lib/db.ts`.

Notes:
- Use the public/proxy host on Vercel/local (append `sslmode=require`).
- The bot can run on Railway as a separate service (see section below). Set `BOT_SERVICE_URL` in Vercel to the bot URL.

## 🤖 Deploy WhatsApp Bot to Render/Railway (Temporary Test)

The WhatsApp bot in `cursor/` must run as a long-lived process and cannot run on Vercel. Use a small host (Render/Railway) and point your Vercel app at it.

1) Deploy a Web Service using the `cursor/` directory:

- Render: New → Web Service → Connect repo → Advanced → Root Directory = `cursor/`
  - Build command: `npm ci`
  - Start command: `node bot.js`
- Railway: New Project → Deploy from GitHub → Set Working Directory = `cursor/`
  - Start command: `node bot.js`
  - Install step on Railway:
    - If you have committed an up-to-date `cursor/package-lock.json`, set Install command to `npm ci` for reproducible builds.
    - If not, keep the default (Nixpacks) which runs `npm install`. Later, commit the refreshed lockfile to switch to `npm ci`.

2) Environment variables for the bot service:

```
PORT=10000                    # Render/Railway sets this automatically; keep empty if managed
APP_URL=https://<your-vercel-app>.vercel.app
# or (preferred) set the API base explicitly
BACKEND_API_URL=https://<your-vercel-app>.vercel.app/api

BOT_INTERNAL_KEY=<same-secret-as-Vercel>
BOT_CLIENT_ID=bot-prod
DEFAULT_COUNTRY_CODE=91
HEADLESS=true                 # run Chrome headless on servers
# Persist session across restarts (use a disk on Render/Railway and point here)
SESSION_DIR=/data/session
```

3) Add a persistent disk (recommended):

- Render: add a disk (e.g., 100MB) and mount at `/data`. Set `SESSION_DIR=/data/session`.
- Railway: add a volume and mount to `/data`. Set `SESSION_DIR=/data/session`.

### Railway: Step-by-step to add and mount a Volume

1. Open your Service in Railway (the one built from `cursor/`).
2. Go to the "Settings" tab:
   - Working Directory: `cursor/`
   - Start Command: `node bot.js`
   - Install Command: `npm ci` (only if `cursor/package-lock.json` is committed and in sync). Otherwise leave default.
3. Go to the "Variables" tab and add:
   - `BACKEND_API_URL=https://<your-vercel-app>.vercel.app/api`
   - `BOT_INTERNAL_KEY=<same-secret-as-in-Vercel>`
   - `BOT_CLIENT_ID=bot-prod`
   - `DEFAULT_COUNTRY_CODE=91` (or your default)
   - `HEADLESS=true`
4. Go to the "Volumes" tab → "Add Volume":
   - Name: e.g. `wa-session`
   - Size: 100–512 MB is usually enough
   - Mount Path: `/data`
   - Save
5. Back to "Variables": set `SESSION_DIR=/data/session`.
6. Redeploy the service.
7. First run will print a QR in logs. Scan it. After you see "Client is ready!", your session is stored at `/data/session` and persists restarts.

Notes:
- If you cannot add a volume yet, you can temporarily set `SESSION_DIR=/tmp/wwebjs_auth` (session will NOT persist across deploys).
- The bot now auto-detects a writable session directory and will log the chosen path. It prefers `SESSION_DIR`, then falls back to `/tmp/wwebjs_auth`, then local `.wwebjs_auth/`.

4) First run: open service logs and scan the QR printed by the bot (ASCII via `qrcode-terminal`). After “Client is ready!” you’re connected.

5) Wire Vercel → Bot:

Set in Vercel Project → Settings → Environment Variables:

```
BOT_SERVICE_URL=https://<your-bot-service-host>
BOT_INTERNAL_KEY=<same-secret-as-above>
```

The app will now call the bot for WhatsApp messages and verification flows.

## 🚀 Features

- **QR Code Generation**: Secure QR codes with embedded hash codes
- **WhatsApp/SMS Integration**: Automatic hash code delivery via Twilio
- **Real-time Verification**: Instant login upon hash verification
- **JWT Authentication**: Secure session management
- **MySQL Database**: Robust data storage with automatic table creation
- **Modern UI**: Beautiful React frontend with Tailwind CSS
- **TypeScript**: Full type safety for better development experience

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Twilio account (for SMS/WhatsApp integration)

## 🛠️ Installation

### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd my-app
npm install
```

### 2. Setup Backend
```bash
# Run the interactive setup script
npm run setup
```

This will:
- Create a `.env` file with your configuration
- Set up database credentials
- Generate a secure JWT secret
- Configure server settings

### 3. Database Setup
1. Install MySQL on your system
2. Create a database named `reverseotp_db` (or your preferred name)
3. The backend will automatically create all required tables

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
npm run server:dev
```
**Terminal 2 - Frontend:**
```bash
npm run dev
```

  The application will be available at:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:5000

  ### Single-command start (Next.js + WhatsApp bot)

  You can run both the Next.js app and the WhatsApp bot together with one command:

  ```bash
  npm run dev:all
  ```

  Notes:
  - The bot exposes an HTTP server at http://localhost:4002 (configurable via `BOT_PORT`).
  - On first run, a WhatsApp QR will print in the terminal; scan it with your phone. The session persists in `.wwebjs_auth/`.
  - To run only the bot: `npm run bot:local`. To run only Next.js: `npm run dev`.

  ## 🔧 Configuration

### Environment Variables

Copy `backend/env.example` to `backend/.env` and configure:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=reverseotp_db
DB_PORT=3306

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
COMPANY_WHATSAPP_NUMBER=+1234567890
```

### Twilio Setup (Optional)

1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Configure webhook URL: `http://localhost:5000/api/webhook/twilio/incoming`
5. Update environment variables

## 📱 How It Works

### Login Flow

1. **User enters phone number** on the login page
2. **Backend generates QR code** with embedded hash
3. **User scans QR code** with their phone
4. **Hash code appears** in their WhatsApp/SMS
5. **User sends hash** to company number
6. **Backend verifies hash** and logs user in automatically
7. **User gains access** to the application

### API Endpoints

#### Authentication
- `POST /api/auth/request-qr` - Generate QR code
- `POST /api/auth/verify-hash` - Verify hash code
- `GET /api/auth/qr-status/:phone` - Check QR status
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

#### Webhooks
- `POST /api/webhook/twilio/incoming` - Handle SMS/WhatsApp messages

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Login Requests Table
```sql
CREATE TABLE login_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  hash_code VARCHAR(255) NOT NULL,
  qr_code_data TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🏗️ Project Structure

```
my-app/
├── app/                    # Next.js app directory
│   ├── login/             # Login page
│   ├── about/             # About page
│   ├── contact/           # Contact page
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   └── QRLogin.tsx       # QR login component
├── backend/              # Express.js backend
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Utility functions
│   │   └── server.js     # Main server file
│   ├── setup.js          # Setup script
│   ├── env.example       # Environment template
│   └── README.md         # Backend documentation
├── lib/                  # Utility libraries
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## 🔒 Security Features

- **JWT Tokens**: Secure session management
- **QR Code Expiration**: 5-minute timeout
- **Database Sessions**: Server-side session tracking
- **Phone Validation**: Input sanitization
- **CORS Protection**: Cross-origin request security
- **Hash Verification**: Cryptographic hash validation

## 🚀 Deployment

### Production Setup

1. **Database**: Set up production MySQL instance
2. **Environment**: Configure production environment variables
3. **Process Manager**: Use PM2 for Node.js process management
4. **SSL**: Set up SSL/TLS certificates
5. **Reverse Proxy**: Configure nginx for load balancing
6. **Monitoring**: Set up logging and monitoring

### Docker Deployment (Optional)

```dockerfile
# Add Dockerfile for containerized deployment
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "run", "server"]
```

## 🧪 Testing

```bash
# Add test scripts to package.json
npm test
```

## 📝 API Documentation

### Request QR Code
```bash
curl -X POST http://localhost:5000/api/auth/request-qr \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

### Verify Hash
```bash
curl -X POST http://localhost:5000/api/auth/verify-hash \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "hash": "abc123..."}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the backend README for detailed API documentation
- Review the setup script for configuration help

## 🔄 Updates

- **v1.0.0**: Initial release with QR code authentication
- **v1.1.0**: Added Twilio integration
- **v1.2.0**: Enhanced security features
- **v1.3.0**: Improved UI/UX and error handling
