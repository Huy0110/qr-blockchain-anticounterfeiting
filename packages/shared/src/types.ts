/**
 * Public type surface — single source of truth for hub, dApp, management
 * portal, and experiments. Field names mirror docs/architecture/database.md
 * and the paper's notation table (lines 1346–1409).
 */

/** Project identifier — bytes32 hex, 0x-prefixed. Maps to paper's `phi`. */
export type Phi = `0x${string}`;

/** Secret identifier — hex, 0x-prefixed, variable length. Paper symbol: `sid`. */
export type Sid = `0x${string}`;

/** Product hash, sha256(sid). bytes32 hex. Paper symbol: `h_i`. */
export type Hash = `0x${string}`;

/** EIP-55 checksummed Ethereum address. Paper symbol: `addr_P`. */
export type Address = `0x${string}`;

/** Producer identity tag in the off-chain DB. */
export type ProducerId = string;

/**
 * Outcome of a verification call. Discriminated on `status` so consumers can
 * narrow exhaustively. See packages/shared/src/outcomes.ts for guard helpers.
 */
export type VerificationOutcome =
  | {
      status: 'AUTHENTIC';
      txHash: string;
      eventArgs: ProductRedeemedEvent;
      verifiedAt: Date;
    }
  | {
      status: 'ALREADY_VERIFIED';
      previousTxHash?: string;
      previousVerifiedAt?: Date;
    }
  | {
      status: 'COUNTERFEIT';
      message: string;
    };

/**
 * Decoded ProductRedeemed event payload. timestamp is the on-chain
 * block.timestamp at execution time (SR3 non-repudiation guarantee).
 */
export interface ProductRedeemedEvent {
  phi: Phi;
  h: Hash;
  producer: Address;
  /** Unix seconds. */
  timestamp: number;
}

/**
 * One step of a producer's cultivation log. Persisted off-chain in MongoDB;
 * displayed on the dApp scan page.
 */
export interface CultivationActivity {
  type: 'land_preparation' | 'planting' | 'fertilizing' | 'pest_control' | 'harvesting' | 'other';
  activityDate: Date;
  name: string;
  description: string;
  materials?: string[];
  note?: string;
}

/** A third-party certification attached to the project (VietGAP, GlobalGAP, …). */
export interface Certification {
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  documentUrl?: string;
}

/** Geo coordinates (WGS84). */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

/** Cultivation site address + province + optional pin. */
export interface CultivationLocation {
  address: string;
  province: string;
  coordinates?: GeoCoordinates;
}

export type ProjectStatus = 'in_progress' | 'harvesting' | 'finished';

/**
 * Off-chain project metadata. Mirrors database.md exactly so MongoDB
 * documents and TypeScript types share names verbatim. The on-chain part
 * (phi → producer binding) lives in the contract; this struct wraps the
 * marketing/traceability data the dApp needs to render.
 */
export interface ProjectMetadata {
  projectId: Phi;
  cooperativeName: string;
  vegetableType: string;
  cultivationLocation: CultivationLocation;
  startDate: Date;
  harvestDate: Date;
  /** Square metres. */
  cultivationArea: number;
  /** Kilograms. */
  expectedOutput: number;
  description: string;
  cultivationActivities: CultivationActivity[];
  certifications: Certification[];
  imageUrls: string[];
  status: ProjectStatus;
  ownerProducerId: ProducerId;
  createdAt: Date;
  updatedAt: Date;
}
