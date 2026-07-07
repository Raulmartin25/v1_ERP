import { Controller, Get, Query } from "@nestjs/common";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("sales")
  sales(@Query("from") from?: string, @Query("to") to?: string) {
    return this.reports.salesSummary(from, to);
  }

  @Get("pnl")
  pnl(@Query("from") from?: string, @Query("to") to?: string) {
    return this.reports.pnl(from, to);
  }
}
