import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { CryptoService } from "../../../common/services/crypto.service";

// We instantiate a static CryptoService for the schema hooks.
// In a full DI setup, this could be a plugin, but this is the cleanest way
// to access the AES logic at the Mongoose abstraction layer.
const cryptoService = new CryptoService();

// List of fields to undergo encryption/decryption
const ENCRYPTED_FIELDS = [
  "diagnosisDetails",
  "asdSeverity",
  "primaryPhysician",
  "specialNeeds",
  "insuranceProvider",
  "insurancePolicyNumber",
  "insuranceGroupNumber",
  "clinicalNotes",
  "caregiverNotes",
];

const ENCRYPTED_ARRAY_FIELDS = [
  "coOccurringConditions",
  "allergies",
  "currentMedications",
  "previousTherapies",
];

// Nested schemas for complex objects
@Schema({ _id: false })
export class Address {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  zipCode?: string;

  @Prop({ default: "USA" })
  country?: string;
}

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  relationship: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  alternatePhone?: string;

  @Prop()
  email?: string;
}

@Schema({ _id: false })
export class CommunicationPreferences {
  @Prop({ default: true })
  emailUpdates: boolean;

  @Prop({ default: true })
  smsReminders: boolean;

  @Prop({ default: false })
  callReminders: boolean;
}

@Schema({ timestamps: true })
export class Patient extends Document {
  // ===== BASIC INFORMATION =====
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  mrn: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  dob: Date;

  @Prop({ required: true, enum: ["male", "female", "other"] })
  gender: string;

  @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
  therapistId: Types.ObjectId;

  // ===== CONTACT INFORMATION =====
  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop({ type: Address })
  address?: Address;

  @Prop()
  preferredLanguage?: string;

  @Prop({ type: CommunicationPreferences })
  communicationPreferences?: CommunicationPreferences;

  // ===== EMERGENCY CONTACT =====
  @Prop({ type: EmergencyContact })
  emergencyContact?: EmergencyContact;

  // ===== MEDICAL INFORMATION =====
  @Prop()
  diagnosisDate?: Date;

  @Prop()
  asdSeverity?: string;

  @Prop()
  diagnosisDetails?: string;

  @Prop()
  primaryPhysician?: string;

  @Prop({ type: [String], default: [] })
  coOccurringConditions?: string[];

  @Prop({ type: [String], default: [] })
  allergies?: string[];

  @Prop({ type: [String], default: [] })
  currentMedications?: string[];

  @Prop()
  specialNeeds?: string;

  @Prop({ type: [String], default: [] })
  previousTherapies?: string[];

  // ===== INSURANCE INFORMATION =====
  @Prop()
  insuranceProvider?: string;

  @Prop()
  insurancePolicyNumber?: string;

  @Prop()
  insuranceGroupNumber?: string;

  // ===== CLINICAL DETAILS =====
  @Prop()
  referralSource?: string;

  @Prop()
  admissionDate?: Date;

  @Prop()
  dischargeDate?: Date;

  @Prop()
  dischargeReason?: string;

  @Prop()
  clinicalNotes?: string;

  @Prop()
  caregiverNotes?: string;

  // ===== SYSTEM FIELDS =====
  @Prop({ default: "active", enum: ["active", "inactive", "discharged"] })
  status: string;

  @Prop()
  progressScore?: number;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Indexes
PatientSchema.index({ therapistId: 1 });
PatientSchema.index({ mrn: 1 });
PatientSchema.index({ status: 1 });

// ========== ENCRYPTION HOOKS ==========

PatientSchema.pre("save", function (next) {
  try {
    const doc: any = this;

    // Encrypt string fields
    for (const field of ENCRYPTED_FIELDS) {
      if (doc.isModified(field) && doc[field]) {
        doc[field] = cryptoService.encryptString(doc[field]);
      }
    }

    // Encrypt array fields
    for (const field of ENCRYPTED_ARRAY_FIELDS) {
      if (doc.isModified(field) && Array.isArray(doc[field])) {
        doc[field] = doc[field].map((val: string) => {
          // Prevent double encrypting if already v1
          if (val.startsWith("v1:")) return val; 
          return cryptoService.encryptString(val);
        });
      }
    }

    // Encrypt nested Address object
    if (doc.isModified("address") && doc.address) {
      const addr = doc.address;
      if (addr.street && !addr.street.startsWith("v1:")) addr.street = cryptoService.encryptString(addr.street);
      if (addr.city && !addr.city.startsWith("v1:")) addr.city = cryptoService.encryptString(addr.city);
    }

    // Encrypt nested Emergency Contact
    if (doc.isModified("emergencyContact") && doc.emergencyContact) {
      const em = doc.emergencyContact;
      if (em.phone && !em.phone.startsWith("v1:")) em.phone = cryptoService.encryptString(em.phone);
      if (em.alternatePhone && !em.alternatePhone.startsWith("v1:")) em.alternatePhone = cryptoService.encryptString(em.alternatePhone);
      if (em.email && !em.email.startsWith("v1:")) em.email = cryptoService.encryptString(em.email);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

PatientSchema.post("init", function (doc: any) {
  try {
    if (!doc) return;

    // Decrypt string fields
    for (const field of ENCRYPTED_FIELDS) {
      if (doc[field] && typeof doc[field] === "string" && doc[field].startsWith("v1:")) {
        doc[field] = cryptoService.decryptString(doc[field]);
      }
    }

    // Decrypt array fields
    for (const field of ENCRYPTED_ARRAY_FIELDS) {
      if (Array.isArray(doc[field])) {
        doc[field] = doc[field].map((val: string) => {
          if (typeof val === "string" && val.startsWith("v1:")) {
            return cryptoService.decryptString(val);
          }
          return val;
        });
      }
    }

    // Decrypt nested Address object
    if (doc.address) {
      const addr = doc.address;
      if (addr.street && addr.street.startsWith("v1:")) addr.street = cryptoService.decryptString(addr.street);
      if (addr.city && addr.city.startsWith("v1:")) addr.city = cryptoService.decryptString(addr.city);
    }

    // Decrypt nested Emergency Contact
    if (doc.emergencyContact) {
      const em = doc.emergencyContact;
      if (em.phone && em.phone.startsWith("v1:")) em.phone = cryptoService.decryptString(em.phone);
      if (em.alternatePhone && em.alternatePhone.startsWith("v1:")) em.alternatePhone = cryptoService.decryptString(em.alternatePhone);
      if (em.email && em.email.startsWith("v1:")) em.email = cryptoService.decryptString(em.email);
    }
  } catch (error) {
    console.error("Error decrypting patient doc details", error);
  }
});

PatientSchema.post("save", function (doc: any) {
  try {
    if (!doc) return;

    // Decrypt string fields
    for (const field of ENCRYPTED_FIELDS) {
      if (doc[field] && typeof doc[field] === "string" && doc[field].startsWith("v1:")) {
        doc[field] = cryptoService.decryptString(doc[field]);
      }
    }

    // Decrypt array fields
    for (const field of ENCRYPTED_ARRAY_FIELDS) {
      if (Array.isArray(doc[field])) {
        doc[field] = doc[field].map((val: string) => {
          if (typeof val === "string" && val.startsWith("v1:")) {
            return cryptoService.decryptString(val);
          }
          return val;
        });
      }
    }

    // Decrypt nested Address object
    if (doc.address) {
      const addr = doc.address;
      if (addr.street && addr.street.startsWith("v1:")) addr.street = cryptoService.decryptString(addr.street);
      if (addr.city && addr.city.startsWith("v1:")) addr.city = cryptoService.decryptString(addr.city);
    }

    // Decrypt nested Emergency Contact
    if (doc.emergencyContact) {
      const em = doc.emergencyContact;
      if (em.phone && em.phone.startsWith("v1:")) em.phone = cryptoService.decryptString(em.phone);
      if (em.alternatePhone && em.alternatePhone.startsWith("v1:")) em.alternatePhone = cryptoService.decryptString(em.alternatePhone);
      if (em.email && em.email.startsWith("v1:")) em.email = cryptoService.decryptString(em.email);
    }
  } catch (error) {
    console.error("Error decrypting patient doc details", error);
  }
});
