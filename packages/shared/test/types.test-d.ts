import { expectAssignable, expectType, expectError } from 'tsd';
import type {
  Phi,
  Sid,
  Hash,
  Address,
  ProjectMetadata,
  ProductRedeemedEvent,
  VerificationOutcome,
  phi,
  sid,
  h,
  addr_P,
} from '../src/index.js';
import { isAuthentic, isAlreadyVerified, isCounterfeit } from '../src/index.js';

// AC-SP-4: notation aliases collapse to canonical types.
expectType<Phi>(('0x' + '0'.repeat(64)) as phi);
expectType<Sid>(('0x' + '0'.repeat(8)) as sid);
expectType<Hash>(('0x' + '0'.repeat(64)) as h);
expectType<Address>(('0x' + '0'.repeat(40)) as addr_P);

// 0x-prefixed branding: a plain string must NOT be assignable.
expectError<Phi>('not-hex');
expectError<Sid>('plain-string');

// AC-SP-6: zero `any` in public API. Construct a fully-typed ProjectMetadata
// and check we can read every field without `any`.
const project: ProjectMetadata = {
  projectId: '0x0000000000000000000000000000000000000000000000000000000000000001',
  cooperativeName: 'HTX Vân Nội',
  vegetableType: 'rau muống',
  cultivationLocation: { address: '...', province: 'Hà Nội' },
  startDate: new Date(),
  harvestDate: new Date(),
  cultivationArea: 1500,
  expectedOutput: 800,
  description: '...',
  cultivationActivities: [],
  certifications: [],
  imageUrls: [],
  status: 'in_progress',
  ownerProducerId: 'producer-001',
  createdAt: new Date(),
  updatedAt: new Date(),
};
expectAssignable<ProjectMetadata>(project);

// VerificationOutcome discriminates exhaustively.
declare const outcome: VerificationOutcome;
if (isAuthentic(outcome)) {
  expectType<string>(outcome.txHash);
  expectType<ProductRedeemedEvent>(outcome.eventArgs);
} else if (isAlreadyVerified(outcome)) {
  expectType<string | undefined>(outcome.previousTxHash);
} else if (isCounterfeit(outcome)) {
  expectType<string>(outcome.message);
}
