# CDN Configuration Guide

## Overview
This guide explains how to configure a Content Delivery Network (CDN) for the Autism Behavior Analysis system to improve performance and reduce server load.

---

## 1. Nginx Configuration (Self-Hosted CDN)

### Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### Configuration File

**`/etc/nginx/sites-available/autism-care`:**

```nginx
# Upstream backend server
upstream backend {
    server localhost:3000;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.autism-care.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.autism-care.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/autism-care.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autism-care.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static Files (Frontend Build)
    location / {
        root /var/www/autism-care/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Video Files (Streaming)
    location /uploads/videos/ {
        alias /var/www/autism-care/backend/uploads/videos/;
        
        # Enable video streaming
        mp4;
        mp4_buffer_size 1m;
        mp4_max_buffer_size 5m;
        
        # Cache for 1 day
        expires 1d;
        add_header Cache-Control "public";
        
        # Security: Only authenticated users
        # Add auth check here if needed
    }

    # Health Check
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/autism-care /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 2. AWS CloudFront (Recommended for Production)

### CloudFormation Template

**`cloudfront-stack.yaml`:**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: CloudFront CDN for Autism Care System

Resources:
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Comment: Autism Care CDN
        
        # Origins
        Origins:
          - Id: backend-api
            DomainName: api.autism-care.com
            CustomOriginConfig:
              HTTPPort: 80
              HTTPSPort: 443
              OriginProtocolPolicy: https-only
              OriginSSLProtocols:
                - TLSv1.2
          
          - Id: s3-videos
            DomainName: autism-care-videos.s3.amazonaws.com
            S3OriginConfig:
              OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/${CloudFrontOAI}'
        
        # Default Cache Behavior (API)
        DefaultCacheBehavior:
          TargetOriginId: backend-api
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
            - PUT
            - POST
            - PATCH
            - DELETE
          CachedMethods:
            - GET
            - HEAD
          ForwardedValues:
            QueryString: true
            Headers:
              - Authorization
              - Content-Type
            Cookies:
              Forward: all
          MinTTL: 0
          DefaultTTL: 0
          MaxTTL: 31536000
        
        # Video Files Cache Behavior
        CacheBehaviors:
          - PathPattern: '/uploads/videos/*'
            TargetOriginId: s3-videos
            ViewerProtocolPolicy: https-only
            AllowedMethods:
              - GET
              - HEAD
            CachedMethods:
              - GET
              - HEAD
            ForwardedValues:
              QueryString: false
              Cookies:
                Forward: none
            MinTTL: 86400
            DefaultTTL: 86400
            MaxTTL: 31536000
            Compress: true
        
        # Custom Error Pages
        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
            ErrorCachingMinTTL: 300
        
        # SSL Certificate
        ViewerCertificate:
          AcmCertificateArn: !Ref SSLCertificate
          SslSupportMethod: sni-only
          MinimumProtocolVersion: TLSv1.2_2021
        
        # Aliases
        Aliases:
          - autism-care.com
          - www.autism-care.com
  
  CloudFrontOAI:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: OAI for Autism Care videos
  
  SSLCertificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: autism-care.com
      SubjectAlternativeNames:
        - www.autism-care.com
      ValidationMethod: DNS

Outputs:
  CloudFrontURL:
    Value: !GetAtt CloudFrontDistribution.DomainName
    Description: CloudFront distribution URL
```

### Deploy CloudFront

```bash
aws cloudformation create-stack \
  --stack-name autism-care-cdn \
  --template-body file://cloudfront-stack.yaml \
  --region us-east-1
```

---

## 3. Cloudflare CDN (Easy Setup)

### Steps

1. **Sign up** at [cloudflare.com](https://cloudflare.com)
2. **Add your domain** (autism-care.com)
3. **Update nameservers** at your domain registrar
4. **Configure DNS**:
   - `A` record: `@` → `<server-ip>`
   - `CNAME` record: `www` → `autism-care.com`
   - `CNAME` record: `api` → `autism-care.com`

### Cloudflare Settings

**SSL/TLS:**
- Mode: Full (strict)
- Always Use HTTPS: On
- Minimum TLS Version: 1.2

**Speed:**
- Auto Minify: JS, CSS, HTML
- Brotli: On
- Early Hints: On

**Caching:**
```
Page Rules:
1. *autism-care.com/api/*
   - Cache Level: Bypass
   
2. *autism-care.com/uploads/videos/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 day
   - Browser Cache TTL: 1 day
   
3. *autism-care.com/*.js
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year
   - Browser Cache TTL: 1 year
```

---

## 4. Application Configuration

### Backend Environment Variables

**`backend/.env`:**
```bash
# CDN Configuration
CDN_ENABLED=true
CDN_BASE_URL=https://cdn.autism-care.com
CDN_VIDEO_PATH=/uploads/videos

# If using S3
AWS_S3_BUCKET=autism-care-videos
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
```

### Backend CDN Service

**`backend/src/services/cdn.service.ts`:**
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CdnService {
  private cdnEnabled: boolean;
  private cdnBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.cdnEnabled = this.configService.get('CDN_ENABLED') === 'true';
    this.cdnBaseUrl = this.configService.get('CDN_BASE_URL') || '';
  }

  getVideoUrl(videoPath: string): string {
    if (this.cdnEnabled && this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}${videoPath}`;
    }
    return videoPath; // Local path
  }

  getStaticAssetUrl(assetPath: string): string {
    if (this.cdnEnabled && this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}${assetPath}`;
    }
    return assetPath;
  }
}
```

---

## 5. Performance Monitoring

### CloudWatch (AWS)

```bash
# Monitor CloudFront metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=<distribution-id> \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Nginx Access Logs

```bash
# Analyze cache hit rate
awk '{print $11}' /var/log/nginx/access.log | sort | uniq -c
```

---

## 6. Cache Invalidation

### CloudFront

```bash
# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"

# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/uploads/videos/*" "/static/*"
```

### Cloudflare

```bash
# Purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
  -H "Authorization: Bearer <api-token>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 7. Cost Optimization

### AWS CloudFront Pricing (Estimate)

| Traffic/Month | Cost |
|--------------|------|
| 10 GB | $0.85 |
| 100 GB | $8.50 |
| 1 TB | $85.00 |
| 10 TB | $850.00 |

### Cloudflare Pricing

- **Free Plan**: Unlimited bandwidth
- **Pro Plan**: $20/month (better performance)
- **Business Plan**: $200/month (advanced features)

---

## Testing

### Test CDN Performance

```bash
# Check response headers
curl -I https://autism-care.com/uploads/videos/sample.mp4

# Should see:
# X-Cache: Hit from cloudfront
# Age: 3600
```

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test CDN
ab -n 1000 -c 100 https://cdn.autism-care.com/static/app.js
```

---

## Checklist

- [ ] Configure Nginx/CloudFront/Cloudflare
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set appropriate cache headers
- [ ] Configure cache invalidation
- [ ] Test video streaming
- [ ] Monitor CDN performance
- [ ] Set up cost alerts
- [ ] Document cache purge procedures
