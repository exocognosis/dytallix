import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { DatabaseModule } from '../database/database.module';
import { ObjectStorageService } from './object-storage.service';

@Module({
    imports: [DatabaseModule],
    controllers: [StorageController],
    providers: [StorageService, ObjectStorageService],
    exports: [StorageService, ObjectStorageService],
})
export class StorageModule { }
