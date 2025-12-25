import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Therapist, TherapistSchema } from './schemas/therapist.schema';
import { Caregiver, CaregiverSchema } from './schemas/caregiver.schema';
import { Admin, AdminSchema } from './schemas/admin.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Therapist.name, schema: TherapistSchema },
      { name: Caregiver.name, schema: CaregiverSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
