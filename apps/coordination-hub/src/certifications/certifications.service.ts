import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { Phi } from '@qr-bc/shared';
import { ProjectsService } from '../projects/projects.service';
import { CertificationNotFoundException } from './exceptions';
import type { CreateCertificationDto, UpdateCertificationDto } from './dto/certification.dto';

@Injectable()
export class CertificationsService {
  constructor(private readonly projects: ProjectsService) {}

  async add(producerId: string, phi: Phi, dto: CreateCertificationDto): Promise<{ id: string }> {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    const subdoc = doc.certifications.create({ ...dto });
    doc.certifications.push(subdoc);
    await doc.save();
    return { id: (subdoc._id as Types.ObjectId).toHexString() };
  }

  async update(
    producerId: string,
    phi: Phi,
    certId: string,
    dto: UpdateCertificationDto,
  ): Promise<void> {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    const subdoc = doc.certifications.id(certId);
    if (!subdoc) throw new CertificationNotFoundException(certId);
    Object.assign(subdoc, dto);
    await doc.save();
  }

  async remove(producerId: string, phi: Phi, certId: string): Promise<void> {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    const subdoc = doc.certifications.id(certId);
    if (!subdoc) throw new CertificationNotFoundException(certId);
    subdoc.deleteOne();
    await doc.save();
  }

  async list(producerId: string, phi: Phi) {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    return doc.certifications;
  }
}
