import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ItWorkspaceService } from './it-workspace.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('it-workspace')
export class ItWorkspaceController {
  constructor(private readonly service: ItWorkspaceService) {}

  @Get('summary')
  summary() { return this.service.summary(); }

  @Get('work-items')
  listWorkItems(@Query() query: any, @Request() req: any) {
    return this.service.listWorkItems(query);
  }

  @Get('work-items/:id')
  getWorkItem(@Param('id') id: string) {
    return this.service.getWorkItem(id);
  }

  @Post('work-items')
  createWorkItem(@Body() body: any, @Request() req: any) {
    return this.service.createWorkItem(body, req.user);
  }

  @Put('work-items/:id')
  updateWorkItem(@Param('id') id: string, @Body() body: any) {
    return this.service.updateWorkItem(id, body);
  }

  @Delete('work-items/:id')
  deleteWorkItem(@Param('id') id: string) {
    return this.service.deleteWorkItem(id);
  }

  @Get('work-items/:id/qa-checks')
  listQaChecks(@Param('id') id: string) {
    return this.service.listQaChecks(id);
  }

  @Post('work-items/:id/qa-checks')
  createQaCheck(@Param('id') id: string, @Body() body: any) {
    return this.service.createQaCheck(id, body);
  }

  @Put('work-items/:id/qa-checks/:checkId')
  updateQaCheck(@Param('id') id: string, @Param('checkId') checkId: string, @Body() body: any) {
    return this.service.updateQaCheck(id, checkId, body);
  }

  @Get('releases')
  listReleases() { return this.service.listReleases(); }

  @Post('releases')
  createRelease(@Body() body: any) { return this.service.createRelease(body); }

  @Post('releases/:id/link')
  linkWorkItem(@Param('id') id: string, @Body() body: any) {
    return this.service.linkWorkItemToRelease(id, body.work_item_id);
  }

  @Post('releases/:id/deploy')
  deployRelease(@Param('id') id: string) { return this.service.deployRelease(id); }
}