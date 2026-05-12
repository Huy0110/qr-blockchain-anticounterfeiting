import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { Phi } from '@qr-bc/shared';
import { ProducersService } from '../producers/producers.service';
import { ContractService } from '../blockchain/contract.service';
import type { ProjectDocument } from './project.schema';
import { Project, toProjectMetadata } from './project.schema';
import { DomainException } from '../common/exceptions/domain.exception';
import {
  OnChainRegistrationFailedException,
  PhiCollisionException,
  ProjectAccessForbiddenException,
  ProjectNotFoundException,
} from './exceptions';
import type { CreateProjectDto, ListProjectsQuery, UpdateProjectDto } from './dto/project.dto';

const MAX_PHI_RETRIES = 3;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    private readonly producers: ProducersService,
    private readonly contract: ContractService,
  ) {}

  async create(producerId: string, dto: CreateProjectDto): Promise<ProjectDocument> {
    const producer = await this.producers.findById(producerId);
    const ownerKey = {
      ciphertext: producer.encryptedPrivateKey,
      iv: producer.encryptionIV,
      authTag: producer.encryptionAuthTag,
    };

    const phi = await this.generateUniquePhi();

    // Atomic flow per Phase 3 review I-2: on-chain leg fires FIRST. If
    // it fails for any reason (RPC blip, gas issue, contract revert),
    // the off-chain doc is never persisted. The producer simply retries
    // POST /projects, which mints a fresh phi. This avoids the
    // orphan-project state where Mongo says "yes" but the chain says "no".
    let txHash: string;
    try {
      txHash = await this.contract.registerProject(phi, ownerKey);
    } catch (err) {
      this.logger.error(
        { err, phi, producerId },
        'On-chain registerProject failed; aborting project creation',
      );
      // Pass through ON_CHAIN_* domain exceptions verbatim so the API
      // surface stays specific (e.g. ON_CHAIN_PROJECT_ALREADY_EXISTS for
      // the unlikely-but-possible chain-vs-DB collision). Wrap unknown
      // errors in our generic 502 so the response carries no infra detail.
      if (err instanceof DomainException) throw err;
      const reason = err instanceof Error ? err.message : 'unknown';
      throw new OnChainRegistrationFailedException(reason);
    }

    return this.projectModel.create({
      projectId: phi,
      ownerProducerId: producer._id as unknown as Types.ObjectId,
      cooperativeName: dto.cooperativeName,
      vegetableType: dto.vegetableType,
      cultivationLocation: dto.cultivationLocation,
      startDate: dto.startDate,
      harvestDate: dto.harvestDate,
      cultivationArea: dto.cultivationArea,
      expectedOutput: dto.expectedOutput,
      description: dto.description,
      txHashRegisterProject: txHash,
    });
  }

  async list(
    producerId: string,
    query: ListProjectsQuery,
  ): Promise<{
    items: ProjectDocument[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const filter: Record<string, unknown> = {
      ownerProducerId: new Types.ObjectId(producerId),
      isDeleted: false,
    };
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOwnedByProducer(producerId: string, phi: Phi): Promise<ProjectDocument> {
    const doc = await this.projectModel.findOne({ projectId: phi, isDeleted: false }).exec();
    if (!doc) throw new ProjectNotFoundException(phi);
    if (doc.ownerProducerId.toHexString() !== producerId) {
      throw new ProjectAccessForbiddenException();
    }
    return doc;
  }

  async findPublic(phi: Phi): Promise<ProjectDocument> {
    const doc = await this.projectModel.findOne({ projectId: phi, isDeleted: false }).exec();
    if (!doc) throw new ProjectNotFoundException(phi);
    if (!['harvesting', 'finished'].includes(doc.status)) {
      throw new ProjectNotFoundException(phi);
    }
    // Cross-check on-chain (per AC for /projects/:phi public read).
    const existsOnChain = await this.contract.projectExists(phi).catch(() => true);
    if (!existsOnChain) throw new ProjectNotFoundException(phi);
    return doc;
  }

  async update(producerId: string, phi: Phi, dto: UpdateProjectDto): Promise<ProjectDocument> {
    const doc = await this.findOwnedByProducer(producerId, phi);
    Object.assign(doc, dto);
    return doc.save();
  }

  async softDelete(producerId: string, phi: Phi): Promise<void> {
    const doc = await this.findOwnedByProducer(producerId, phi);
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    await doc.save();
  }

  /** Public surface helper. */
  toMetadata = toProjectMetadata;

  private async generateUniquePhi(): Promise<Phi> {
    for (let i = 0; i < MAX_PHI_RETRIES; i++) {
      const phi = randomPhi();
      // Cheap off-chain pre-check + on-chain check. If the on-chain probe
      // throws (RPC down etc.), fall back to off-chain only — registerProject
      // itself will revert with ProjectAlreadyExists if the chain disagrees.
      const dbExists = await this.projectModel.exists({ projectId: phi }).exec();
      if (dbExists) continue;
      let chainExists = false;
      try {
        chainExists = await this.contract.projectExists(phi);
      } catch {
        /* RPC unavailable — proceed and let registerProject fail loudly if needed */
      }
      if (!chainExists) return phi;
    }
    throw new PhiCollisionException();
  }
}

function randomPhi(): Phi {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '0x';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex as Phi;
}
