import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { MenuModule } from "./menu/menu.module";
import { ModifiersModule } from "./modifiers/modifiers.module";
import { OrdersModule } from "./orders/orders.module";
import { TablesModule } from "./tables/tables.module";
import { LedgerModule } from "./ledger/ledger.module";
import { ReportsModule } from "./reports/reports.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    // Load env from the repo root so DATABASE_URL etc. are available.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    HealthModule,
    IngredientsModule,
    MenuModule,
    ModifiersModule,
    OrdersModule,
    TablesModule,
    LedgerModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
