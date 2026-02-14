# Database Encryption at Rest

## Overview
This document explains how to enable MongoDB encryption at rest for protecting sensitive patient health information (PHI).

## Encryption Methods

### 1. MongoDB Enterprise Encryption at Rest (Recommended for Production)

MongoDB Enterprise provides native encryption at rest using the WiredTiger storage engine.

#### Configuration

**mongod.conf:**
```yaml
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/mongodb-keyfile

storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

#### Generate Key File

```bash
# Generate 32-byte random key
openssl rand -base64 32 > /path/to/mongodb-keyfile

# Set permissions (MongoDB requires 600)
chmod 600 /path/to/mongodb-keyfile
chown mongodb:mongodb /path/to/mongodb-keyfile
```

#### Start MongoDB with Encryption

```bash
mongod --enableEncryption --encryptionKeyFile /path/to/mongodb-keyfile
```

---

### 2. Client-Side Field Level Encryption (CSFLE)

For granular encryption of specific fields (e.g., patient names, contact info).

#### Generate Encryption Key

```bash
cd backend/scripts
node generate-encryption-key.js
```

Copy the output to your `.env` file.

#### Environment Variables

**backend/.env:**
```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/autism-care?retryWrites=true&w=majority

# Encryption Key (96-byte base64-encoded)
ENCRYPTION_KEY=<your-generated-key-here>

# Key Vault Database
ENCRYPTION_KEY_VAULT_NAMESPACE=encryption.__keyVault
```

#### Application Configuration

**backend/src/config/database.config.ts:**
```typescript
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService) => ({
  uri: configService.get<string>('MONGODB_URI'),
  autoEncryption: {
    keyVaultNamespace: configService.get<string>('ENCRYPTION_KEY_VAULT_NAMESPACE'),
    kmsProviders: {
      local: {
        key: Buffer.from(configService.get<string>('ENCRYPTION_KEY'), 'base64')
      }
    },
    schemaMap: {
      'autism-care.patients': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: '/keyId'
        },
        properties: {
          fullName: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
            }
          },
          emergencyContact: {
            encrypt: {
              bsonType: 'object',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          }
        }
      }
    }
  }
});
```

#### Update App Module

**backend/src/app.module.ts:**
```typescript
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
  ],
})
```

---

### 3. Disk-Level Encryption (OS/Cloud Provider)

#### AWS EBS Encryption

```bash
# Enable encryption for EBS volumes
aws ec2 create-volume \
  --size 100 \
  --encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789:key/abcd-1234 \
  --availability-zone us-east-1a
```

#### Azure Disk Encryption

```bash
# Enable encryption for Azure managed disks
az vm encryption enable \
  --resource-group myResourceGroup \
  --name myVM \
  --disk-encryption-keyvault myKeyVault
```

---

## HIPAA Compliance Checklist

- [ ] Enable encryption at rest (MongoDB Enterprise or disk-level)
- [ ] Implement client-side field level encryption for PHI
- [ ] Secure encryption keys with proper access controls
- [ ] Backup encryption keys to secure location
- [ ] Document key rotation procedures
- [ ] Enable audit logging for encryption key access
- [ ] Test encryption/decryption functionality
- [ ] Verify encrypted data in database

---

## Key Management Best Practices

### 1. Key Storage

- **Development**: Local file with restricted permissions
- **Production**: Use Key Management Service (KMS)
  - AWS KMS
  - Azure Key Vault
  - Google Cloud KMS
  - HashiCorp Vault

### 2. Key Rotation

Rotate encryption keys every 90 days:

```bash
# Generate new key
node scripts/generate-encryption-key.js

# Update .env with new key
# Restart application
# Re-encrypt existing data (migration script needed)
```

### 3. Key Backup

```bash
# Backup encryption key securely
cp /path/to/mongodb-keyfile /secure/backup/location/mongodb-keyfile.backup.$(date +%Y%m%d)

# Encrypt backup
gpg --encrypt --recipient admin@autism-care.com mongodb-keyfile.backup
```

---

## Testing Encryption

### Verify Encryption is Active

```javascript
// Connect to MongoDB
use autism-care

// Check if data is encrypted
db.patients.findOne()
// Encrypted fields should show as Binary data in raw storage

// Application should decrypt automatically
```

### Test Decryption

```bash
# Run test
npm run test:e2e -- encryption.e2e-spec.ts
```

---

## Troubleshooting

### Error: "Encryption key not found"

**Solution**: Ensure `ENCRYPTION_KEY` is set in `.env` and is base64-encoded.

### Error: "Failed to decrypt"

**Solution**: Key may have changed. Restore from backup or re-encrypt data.

### Performance Impact

Encryption adds ~5-10% overhead. Monitor with:

```bash
# Check MongoDB performance
db.serverStatus().metrics.operation
```

---

## Production Deployment

### Docker Compose

```yaml
services:
  mongodb:
    image: mongo:7.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - ./mongodb-keyfile:/etc/mongodb-keyfile:ro
    command: >
      mongod
      --enableEncryption
      --encryptionKeyFile /etc/mongodb-keyfile
      --auth
```

### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-encryption-key
type: Opaque
data:
  key: <base64-encoded-key>
```

---

## References

- [MongoDB Encryption at Rest](https://docs.mongodb.com/manual/core/security-encryption-at-rest/)
- [Client-Side Field Level Encryption](https://docs.mongodb.com/manual/core/security-client-side-encryption/)
- [HIPAA Compliance Guide](https://www.mongodb.com/collateral/mongodb-hipaa-reference-architecture)
