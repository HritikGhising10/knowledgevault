import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/issue.dto';
import { AuthGuard } from 'src/auth/gaurds/gaurds';
import { userType } from 'src/auth/dto/auth.dto';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) { }



  @Post("create")
  @UseGuards(AuthGuard)

  async createIssue(
    @Body() createIssue: CreateIssueDto,
    @Req() req: userType
  ) {
    return this.issuesService.createIssue(createIssue, req);
  }


  @Get("all")
  @UseGuards(AuthGuard)
  async getAllIssues(
    @Req() req: userType
  ) {
    return this.issuesService.getAllIssues(req);
  }

  @Get("repo/:repoid")
  @UseGuards(AuthGuard)
  async getIssuesByRepoId(
    @Req() req: userType,
    @Param('repoid') repoid: string
  ) {
    return this.issuesService.getIssuesByRepoId(req, repoid);
  }

  @Get("issue/:issueid")
  @UseGuards(AuthGuard)
  async getIssueById(
    @Req() req: userType,
    @Param('issueid') issueid: string
  ) {
    return this.issuesService.getIssueById(req, issueid);
  }


  @Put("comment/:issueid")
  @UseGuards(AuthGuard)
  async addComment(
    @Req() req: userType,
    @Param('issueid') issueid: string,
    @Body() body: { comment: string }
  ) {
    return this.issuesService.addComment(req, issueid, body.comment);
  }




  @Get("search/:issuename")
  @UseGuards(AuthGuard)
  async searchIssue(
    @Req() req: userType,
    @Param('issuename') issuename: string,
  ) {
    return this.issuesService.searchIssue(req, issuename);
  }
}
