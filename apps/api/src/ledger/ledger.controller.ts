import { Controller, Get, Post } from "@nestjs/common";
import { LedgerService } from "./ledger.service";

@Controller()
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get("accounts")
  accounts() {
    return this.ledger.accountsWithBalances();
  }

  @Get("ledger")
  entries() {
    return this.ledger.listEntries();
  }

  @Post("ledger/backfill")
  backfill() {
    return this.ledger.backfill();
  }
}
