import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { Phi } from '@qr-bc/shared';
import { ProjectsService } from '../projects/projects.service';
import { ProjectNotFoundException } from '../projects/exceptions';
import { ActivityNotFoundException } from './exceptions';
import type { CreateActivityDto, UpdateActivityDto } from './dto/cultivation-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly projects: ProjectsService) {}

  async add(producerId: string, phi: Phi, dto: CreateActivityDto): Promise<{ id: string }> {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    const subdoc = doc.cultivationActivities.create({ ...dto });
    doc.cultivationActivities.push(subdoc);
    await doc.save();
    return { id: (subdoc._id as Types.ObjectId).toHexString() };
  }

  async update(
    producerId: string,
    phi: Phi,
    activityId: string,
    dto: UpdateActivityDto,
  ): Promise<void> {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    const subdoc = doc.cultivationActivities.id(activityId);
    if (!subdoc) throw new ActivityNotFoundException(activityId);
    Object.assign(subdoc, dto);
    await doc.save();
  }

  async remove(producerId: string, phi: Phi, activityId: string): Promise<void> {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    const subdoc = doc.cultivationActivities.id(activityId);
    if (!subdoc) throw new ActivityNotFoundException(activityId);
    subdoc.deleteOne();
    await doc.save();
  }

  async list(producerId: string, phi: Phi) {
    const doc = await this.projects.findOwnedByProducer(producerId, phi);
    if (!doc) throw new ProjectNotFoundException(phi);
    return doc.cultivationActivities;
  }
}
