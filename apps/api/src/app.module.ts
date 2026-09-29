import { Module } from '@nestjs/common';
import { AdminLevelsController } from './admin/admin-levels.controller.js';
import { AdminSkillsController } from './admin/admin-skills.controller.js';
import { AdminUsersController } from './admin/admin-users.controller.js';
import { ContentService } from './admin/content.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogController } from './catalog/catalog.controller.js';
import { ClassesController } from './classes/classes.controller.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { ParentController } from './parent/parent.controller.js';
import { PracticeController } from './practice/practice.controller.js';
import { PublicController } from './public/public.controller.js';
import { ReportsService } from './reports/reports.service.js';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [
    HealthController,
    PublicController,
    CatalogController,
    PracticeController,
    ParentController,
    ClassesController,
    AdminSkillsController,
    AdminLevelsController,
    AdminUsersController,
  ],
  providers: [ReportsService, ContentService],
})
export class AppModule {}
