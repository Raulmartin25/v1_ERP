import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  index() {
    return {
      name: "Restaurant ERP API",
      version: "0.1.0",
      status: "running",
      endpoints: {
        health: "/api/health",
        ingredients: "/api/ingredients",
        menuItems: "/api/menu-items",
        modifierGroups: "/api/modifier-groups",
        orders: "/api/orders",
        tables: "/api/tables",
        accounts: "/api/accounts",
        ledger: "/api/ledger",
        reports: "/api/reports/sales, /api/reports/pnl",
      },
    };
  }
}
