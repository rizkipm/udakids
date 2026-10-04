import { Module } from '@nestjs/common';
import { AdminDirectoryController } from './admin/admin-directory.controller.js';
import { AdminLevelsController } from './admin/admin-levels.controller.js';
import { AdminSkillsController } from './admin/admin-skills.controller.js';
import { AdminUsersController } from './admin/admin-users.controller.js';
import { ContentService } from './admin/content.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminMailController } from './mail/admin-mail.controller.js';
import { NewsController } from './news/news.controller.js';
import { NewsService } from './news/news.service.js';
import { ExpiryReminderService } from './billing/expiry-reminder.service.js';
import { AdminNotificationsController } from './admin/admin-notifications.controller.js';
import { MailModule } from './mail/mail.module.js';
import { AdminContestController } from './contest/admin-contest.controller.js';
import { ContestController } from './contest/contest.controller.js';
import { LeaderboardController } from './leaderboard/leaderboard.controller.js';
import { MediaController } from './media/media.controller.js';
import { AdminBillingController } from './billing/admin-billing.controller.js';
import { AdminFinanceController } from './billing/admin-finance.controller.js';
import { BillingService } from './billing/billing.service.js';
import { ParentBillingController } from './billing/parent-billing.controller.js';
import { CatalogController } from './catalog/catalog.controller.js';
import { ClassesController } from './classes/classes.controller.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { ParentController } from './parent/parent.controller.js';
import { ParentOverviewController } from './parent/overview.controller.js';
import { PracticeController } from './practice/practice.controller.js';
import { PublicController } from './public/public.controller.js';
import { InsightsController } from './reports/insights.controller.js';
import { ReportsService } from './reports/reports.service.js';
import { SettingsService } from './settings/settings.service.js';
import { TTS_PROVIDER, ttsFromEnv } from './voice/tts.provider.js';
import { AdminVoiceController, VoiceController } from './voice/voice.controller.js';
import { VoiceService } from './voice/voice.service.js';

@Module({
  imports: [DbModule, MailModule, AuthModule],
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
    AdminDirectoryController,
    ParentBillingController,
    ParentOverviewController,
    AdminBillingController,
    AdminFinanceController,
    VoiceController,
    InsightsController,
    LeaderboardController,
    ContestController,
    AdminContestController,
    MediaController,
    AdminMailController,
    NewsController,
    AdminNotificationsController,
    AdminVoiceController,
  ],
  providers: [
    NewsService,
    ExpiryReminderService,
    ReportsService,
    ContentService,
    SettingsService,
    BillingService,
    VoiceService,
    { provide: TTS_PROVIDER, useFactory: ttsFromEnv },
  ],
})
export class AppModule {}
