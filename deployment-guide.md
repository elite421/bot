# Deployment Guide (Unified Next.js)

Important: The app now uses a single Next.js application for both frontend and backend APIs. The sections below about a separate Express backend are legacy and only left here for reference. Prefer the unified deployment steps.

## Recommended: Vercel / Render (Next.js)

1) Set environment variables from `.env.local` in your hosting dashboard:

```
NEXT_PUBLIC_API_URL=/api
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-strong-secret
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
JWT_SECRET=your-strong-secret
BOT_SERVICE_URL=... (optional)
BOT_INTERNAL_KEY=... (optional)
COMPANY_WHATSAPP_NUMBER=+919756862551
```

2) Build and deploy normally (Vercel auto-detects Next.js). No separate backend needed.

3) After deploy, verify API health by hitting `https://your-domain.com/api/auth/me` with a valid Bearer token.

---

## Legacy: cPanel (Express) — reference only

## Option 1: Node.js App Manager (Recommended)

### Prerequisites
- cPanel with Node.js App Manager enabled
- MySQL database access in cPanel
- Domain or subdomain configured

### Steps:

1. **Prepare Your Application**
   ```bash
   # Build the frontend
   npm run build
   
   # Create production package
   npm run build:prod
   ```

2. **In cPanel:**
   - Go to "Node.js App Manager"
   - Click "Create Application"
   - Choose your domain/subdomain
   - Set Node.js version (18.x or higher)
   - Upload your application files
   - Set the startup file to: `backend/src/server.js`
   - Set the application URL

3. **Environment Variables in cPanel:**
   ```
   DB_HOST=localhost
   DB_USER=your_cpanel_db_user
   DB_PASSWORD=your_cpanel_db_password
   DB_NAME=your_cpanel_db_name
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   PORT=3000
   FRONTEND_URL=https://yourdomain.com
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   COMPANY_WHATSAPP_NUMBER=your_company_number
   ```

4. **Database Setup:**
   - Create MySQL database in cPanel
   - Import the database schema
   - Update environment variables with new database credentials

## Option 2: Traditional cPanel Deployment

### Frontend (Next.js) Deployment:

1. **Build the Application:**
   ```bash
   npm run build
   npm run export  # For static export
   ```

2. **Upload to cPanel:**
   - Upload the `out` folder contents to `public_html`
   - Or upload to a subdomain directory

3. **Configure .htaccess:**
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ /index.html [L]
   ```

### Backend Deployment:

1. **Prepare Backend:**
   ```bash
   # Create production build
   npm run build:backend
   ```

2. **Upload to cPanel:**
   - Upload backend files to a subdirectory (e.g., `api`)
   - Set up as a subdomain (e.g., `api.yourdomain.com`)

3. **Configure .htaccess for API:**
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ server.js [QSA,L]
   ```

## Option 3: VPS/Dedicated Server with cPanel

If you have a VPS with cPanel:

1. **SSH Access:**
   ```bash
   # Connect via SSH
   ssh username@your-server-ip
   
   # Navigate to your domain directory
   cd public_html
   
   # Clone your repository
   git clone your-repo-url
   
   # Install dependencies
   npm install
   
   # Set up environment
   cp .env.example .env
   # Edit .env with production values
   
   # Start the application
   npm run start:prod
   ```

2. **Set up PM2 for Process Management:**
   ```bash
   npm install -g pm2
   pm2 start backend/src/server.js --name "reverseotp-backend"
   pm2 startup
   pm2 save
   ```

## Environment Configuration for Production

### Database Configuration:
```env
# Production Database (cPanel MySQL)
DB_HOST=localhost
DB_USER=your_cpanel_username_dbname
DB_PASSWORD=your_secure_password
DB_NAME=your_cpanel_username_dbname
DB_PORT=3306
```

### Frontend Configuration:
```env
# Update API URL in frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Security Considerations:
```env
# Use strong JWT secret
JWT_SECRET=your_very_long_random_secret_key_here
JWT_EXPIRES_IN=24h

# HTTPS URLs
FRONTEND_URL=https://yourdomain.com
```

## Database Migration

### Create Database Tables:
```sql
-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_email (email)
);

-- Login requests table
CREATE TABLE login_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  hash_code VARCHAR(255) NOT NULL,
  qr_code_data TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  INDEX idx_phone (phone),
  INDEX idx_hash (hash_code),
  INDEX idx_expires (expires_at)
);

-- Sessions table
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
);
```

## SSL/HTTPS Configuration

### For Node.js App Manager:
- Enable SSL in cPanel
- Update environment variables to use HTTPS URLs

### For Traditional Deployment:
- Install SSL certificate in cPanel
- Update frontend API calls to use HTTPS
- Configure CORS to allow HTTPS origins

## Troubleshooting

### Common Issues:

1. **Port Issues:**
   - cPanel Node.js apps typically run on port 3000
   - Update PORT environment variable accordingly

2. **Database Connection:**
   - Use cPanel database credentials
   - Ensure database exists and tables are created

3. **File Permissions:**
   - Set appropriate file permissions (755 for directories, 644 for files)
   - Ensure Node.js can write to log files

4. **CORS Issues:**
   - Update CORS configuration in backend
   - Allow your domain in the origins list

### Logs and Debugging:
- Check cPanel error logs
- Use console.log for debugging
- Monitor application logs in cPanel

## Performance Optimization

1. **Enable Gzip Compression**
2. **Use CDN for static assets**
3. **Optimize images and assets**
4. **Enable caching headers**
5. **Use PM2 for process management**

## Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Strong JWT secrets
- [ ] Secure database credentials
- [ ] Input validation
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Environment variable security 