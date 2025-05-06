import { Body, Controller, Delete, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { RepoService } from './repo.service';
import { createRepoDTO } from './dto/repo.dto';
import { AuthGuard } from 'src/auth/gaurds/gaurds';
import { userType } from 'src/auth/dto/auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('repo')
export class RepoController {
  constructor(private readonly repoService: RepoService) {

  }


  @Get("askai/:reponame")
  @UseGuards(AuthGuard)
  async askAI(
    @Param('reponame') reponame: string,
  ) {
    return this.repoService.askAI(reponame);
  }



  @Post('create')
  @UseGuards(AuthGuard)
  async createRepo(
    @Body() repo: createRepoDTO,
    @Req() req: userType
  ) {
    return this.repoService.createRepo(repo, req);
  }

  @Get("getall")
  @UseGuards(AuthGuard)
  async getAllRepo(
    @Req() req: userType
  ) {
    return this.repoService.getAllRepo(req);
  }


  @Get("get/:reponame")
  @UseGuards(AuthGuard)
  async getRepo(
    @Req() req: userType,
    @Param('reponame') reponame: string
  ) {
    return this.repoService.getRepo(req, reponame);
  }


  @Post("addfile/:reponame")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async addFile(
    @Req() req: userType,
    @Param('reponame') reponame: string,
    @Body("filename") filename: string,
    @Body("description") description: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.repoService.addFile(req, reponame, file, filename, description);
  }




  @Get("search/:reponame")
  @UseGuards(AuthGuard)
  async searchFile(
    @Req() req: userType,
    @Param('reponame') reponame: string,
  ) {
    return this.repoService.searchRepo(req, reponame);
  }




  @Post("adddocumentation/:repoid")
  @UseGuards(AuthGuard)
  async addDocumentation(
    @Req() req: userType,
    @Param('repoid') repoid: string,
    @Body("documentation") documentation: string,
  ) {
    return this.repoService.addDocumentation(req, repoid, documentation);
  }


}
