# SSL/HTTPS Setup for Dytallix

## Current Status
- Server IP: 178.156.187.81
- Domain: dytallix.com
- DNS Issue: Domain currently points to 74.208.236.90 (wrong IP)

## Step 1: Update DNS Records

Go to your domain registrar or DNS provider and update these records:

### Required DNS Records:
```
Type: A
Name: @
Value: 178.156.187.81
TTL: 300 (or default)

Type: A
Name: www
Value: 178.156.187.81
TTL: 300 (or default)
```

### Check DNS Propagation
After updating, wait 5-30 minutes and verify:
```bash
dig +short dytallix.com A
dig +short www.dytallix.com A
```
Both should return: `178.156.187.81`

## Step 2: Get SSL Certificate

Once DNS is updated and propagating, run these commands on the Hetzner server:

### Option A: Automatic Setup (Recommended)
```bash
ssh root@178.156.187.81

# Run certbot with nginx plugin
certbot --nginx -d dytallix.com -d www.dytallix.com --non-interactive --agree-tos --email your-email@example.com

# This will:
# 1. Get the SSL certificate from Let's Encrypt
# 2. Automatically update nginx config
# 3. Set up auto-renewal
```

### Option B: Manual Certificate (if automatic fails)
```bash
ssh root@178.156.187.81

# Get certificate only
certbot certonly --webroot -w /var/www/html -d dytallix.com -d www.dytallix.com --non-interactive --agree-tos --email your-email@example.com

# Then update nginx config manually
```

## Step 3: Update Nginx Config (if manual)

If you used Option B, update `/etc/nginx/sites-available/dytallix`:

```nginx
server {
    listen 80;
    server_name dytallix.com www.dytallix.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dytallix.com www.dytallix.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/dytallix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dytallix.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root directory
    root /root/dytallix-fast-launch/frontend/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # RPC
    location /rpc {
        proxy_pass http://localhost:8545;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then reload nginx:
```bash
nginx -t
systemctl reload nginx
```

## Step 4: Test Certificate

```bash
# Check certificate
curl -I https://dytallix.com

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=dytallix.com
```

## Step 5: Auto-Renewal

Certbot automatically sets up renewal. Verify:
```bash
# Check renewal timer
systemctl status certbot.timer

# Test renewal
certbot renew --dry-run
```

## Verification Commands

After setup, verify everything works:

```bash
# 1. Check DNS
dig +short dytallix.com A

# 2. Check HTTP redirect to HTTPS
curl -I http://dytallix.com

# 3. Check HTTPS
curl -I https://dytallix.com

# 4. Check certificate details
echo | openssl s_client -servername dytallix.com -connect dytallix.com:443 2>/dev/null | openssl x509 -noout -dates

# 5. View certificate info
certbot certificates
```

## Troubleshooting

### DNS not propagating
- Clear local DNS cache: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` (macOS)
- Check propagation: https://dnschecker.org/#A/dytallix.com

### Certbot fails with "connection refused"
- Ensure nginx is running: `systemctl status nginx`
- Check firewall allows HTTP/HTTPS: `ufw status`
- Verify port 80 is accessible: `curl -I http://dytallix.com`

### Certificate renewal fails
- Check certbot logs: `cat /var/log/letsencrypt/letsencrypt.log`
- Manually renew: `certbot renew --force-renewal`

## Quick Command Reference

```bash
# Check all services
ssh root@178.156.187.81 "systemctl status nginx dytallix-node dytallix-api"

# View nginx error log
ssh root@178.156.187.81 "tail -50 /var/log/nginx/error.log"

# View certbot logs
ssh root@178.156.187.81 "tail -50 /var/log/letsencrypt/letsencrypt.log"

# Test nginx config
ssh root@178.156.187.81 "nginx -t"

# Reload nginx
ssh root@178.156.187.81 "systemctl reload nginx"
```

## Current Status Summary

✅ Nginx configured and running
✅ Frontend deployed and accessible
✅ API and RPC proxied correctly
❌ DNS points to wrong IP (needs update)
❌ SSL certificate not installed (waiting for DNS)

## Next Steps

1. **Update DNS now** (at your registrar/DNS provider)
2. **Wait 15-30 minutes** for propagation
3. **Run certbot** to get SSL certificate
4. **Test HTTPS** access
5. **Done!** Site will be secure with valid SSL
