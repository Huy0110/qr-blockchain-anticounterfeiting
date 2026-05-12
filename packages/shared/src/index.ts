/**
 * @qr-bc/shared — public surface.
 *
 * Consumers (coordination-hub, dapp-portal, management-portal, experiments)
 * should import from this entry exclusively. Subpath imports into ./src
 * are not part of the supported API.
 */

export type {
  Phi,
  Sid,
  Hash,
  Address,
  ProducerId,
  ProjectStatus,
  ProjectMetadata,
  CultivationActivity,
  CultivationLocation,
  Certification,
  GeoCoordinates,
  VerificationOutcome,
  ProductRedeemedEvent,
} from './types.js';

export type { phi, sid, h, addr_P } from './notation.js';

export { isAuthentic, isAlreadyVerified, isCounterfeit } from './outcomes.js';

export {
  hashSid,
  generateSid,
  InvalidByteLengthError,
  InvalidHexError,
  NoCsprngError,
  MIN_SID_BYTES,
  DEFAULT_SID_BYTES,
} from './hashing.js';

export type {
  ProductRegistryContract,
  ProductRedeemedEventArgs,
  ProjectCreatedEventArgs,
  ProductsRegisteredEventArgs,
  VerifyProductResult,
} from './abi/types.js';

import ProductRegistryArtifact from './abi/ProductRegistry.json';
export const ProductRegistryABI = ProductRegistryArtifact.abi;
export const ProductRegistryContractName = ProductRegistryArtifact.contractName;
export const ProductRegistrySourceName = ProductRegistryArtifact.sourceName;
