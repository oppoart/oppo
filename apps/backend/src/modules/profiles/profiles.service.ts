import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    this.logger.log('Finding all profiles for user', { userId });
    
    return this.prisma.artistProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    this.logger.log('Finding profile', { profileId: id, userId });
    
    const profile = await this.prisma.artistProfile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  async create(userId: string, createProfileDto: CreateProfileDto) {
    this.logger.log('Creating new profile', { userId, name: createProfileDto.name });
    
    return this.prisma.artistProfile.create({
      data: {
        ...createProfileDto,
        userId,
      },
    });
  }

  async update(id: string, userId: string, updateProfileDto: UpdateProfileDto) {
    this.logger.log('Updating profile', { profileId: id, userId });
    
    // Verify ownership
    await this.findOne(id, userId);
    
    return this.prisma.artistProfile.update({
      where: { id },
      data: updateProfileDto,
    });
  }

  async remove(id: string, userId: string) {
    this.logger.log('Deleting profile', { profileId: id, userId });
    
    // Verify ownership
    await this.findOne(id, userId);
    
    return this.prisma.artistProfile.delete({
      where: { id },
    });
  }
}
