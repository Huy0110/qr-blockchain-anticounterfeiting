import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument, Types } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type {
  CultivationActivity as CultivationActivityType,
  Certification as CertificationType,
  ProjectMetadata,
  ProjectStatus,
  Phi,
} from '@qr-bc/shared';

/** Embedded cultivation activity sub-schema (database.md §3.2). */
@Schema({ _id: true, timestamps: true })
export class CultivationActivity {
  @Prop({
    type: String,
    enum: ['land_preparation', 'planting', 'fertilizing', 'pest_control', 'harvesting', 'other'],
    required: true,
  })
  type!: CultivationActivityType['type'];

  @Prop({ type: Date, required: true })
  activityDate!: Date;

  @Prop({ type: String, required: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, maxlength: 2000, default: '' })
  description!: string;

  @Prop({ type: [String], default: [] })
  materials!: string[];

  @Prop({ type: String, maxlength: 500 })
  note?: string;
}
export const CultivationActivitySchema = SchemaFactory.createForClass(CultivationActivity);

@Schema({ _id: true, timestamps: true })
export class Certification {
  @Prop({ type: String, required: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, required: true, maxlength: 200 })
  issuer!: string;

  @Prop({ type: Date, required: true })
  issueDate!: Date;

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop({ type: String, maxlength: 500 })
  documentUrl?: string;
}
export const CertificationSchema = SchemaFactory.createForClass(Certification);

@Schema({ _id: false })
export class CultivationLocation {
  @Prop({ type: String, required: true, maxlength: 200 })
  address!: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  province!: string;

  @Prop({
    type: new MongooseSchema(
      {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
      },
      { _id: false },
    ),
  })
  coordinates?: { lat: number; lng: number };
}
export const CultivationLocationSchema = SchemaFactory.createForClass(CultivationLocation);

/**
 * Project schema per database.md §3.2.
 * `projectId` IS phi (bytes32 hex). `ownerProducerId` references Producer._id.
 */
@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({
    type: String,
    required: true,
    unique: true,
    match: /^0x[a-fA-F0-9]{64}$/,
    index: true,
  })
  projectId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Producer', required: true, index: true })
  ownerProducerId!: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 200 })
  cooperativeName!: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  vegetableType!: string;

  @Prop({ type: CultivationLocationSchema, required: true })
  cultivationLocation!: CultivationLocation;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, required: true })
  harvestDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  cultivationArea!: number;

  @Prop({ type: Number, required: true, min: 0 })
  expectedOutput!: number;

  @Prop({ type: String, maxlength: 5000, default: '' })
  description!: string;

  @Prop({ type: [CultivationActivitySchema], default: [] })
  cultivationActivities!: Types.DocumentArray<HydratedDocument<CultivationActivity>>;

  @Prop({ type: [CertificationSchema], default: [] })
  certifications!: Types.DocumentArray<HydratedDocument<Certification>>;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  @Prop({
    type: String,
    enum: ['in_progress', 'harvesting', 'finished'],
    default: 'in_progress',
    index: true,
  })
  status!: ProjectStatus;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted!: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: String, match: /^0x[a-fA-F0-9]{64}$/ })
  txHashRegisterProject?: string;
}

export type ProjectDocument = HydratedDocument<Project>;
export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ ownerProducerId: 1, isDeleted: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, isDeleted: 1 });

/** Map a Mongoose doc to the @qr-bc/shared ProjectMetadata public type. */
export function toProjectMetadata(doc: ProjectDocument): ProjectMetadata & {
  id: string;
  txHashRegisterProject?: string;
} {
  return {
    projectId: doc.projectId as Phi,
    cooperativeName: doc.cooperativeName,
    vegetableType: doc.vegetableType,
    cultivationLocation: {
      address: doc.cultivationLocation.address,
      province: doc.cultivationLocation.province,
      ...(doc.cultivationLocation.coordinates
        ? { coordinates: doc.cultivationLocation.coordinates }
        : {}),
    },
    startDate: doc.startDate,
    harvestDate: doc.harvestDate,
    cultivationArea: doc.cultivationArea,
    expectedOutput: doc.expectedOutput,
    description: doc.description,
    cultivationActivities: doc.cultivationActivities.map((a) => ({
      type: a.type,
      activityDate: a.activityDate,
      name: a.name,
      description: a.description,
      ...(a.materials && a.materials.length > 0 ? { materials: a.materials } : {}),
      ...(a.note ? { note: a.note } : {}),
    })) as CultivationActivityType[],
    certifications: doc.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate,
      ...(c.expiryDate ? { expiryDate: c.expiryDate } : {}),
      ...(c.documentUrl ? { documentUrl: c.documentUrl } : {}),
    })) as CertificationType[],
    imageUrls: doc.imageUrls,
    status: doc.status,
    ownerProducerId: doc.ownerProducerId.toHexString(),
    createdAt: doc.get('createdAt'),
    updatedAt: doc.get('updatedAt'),
    id: (doc._id as Types.ObjectId).toHexString(),
    ...(doc.txHashRegisterProject ? { txHashRegisterProject: doc.txHashRegisterProject } : {}),
  };
}
