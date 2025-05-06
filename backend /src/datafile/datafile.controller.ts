// src/datafile/datafile.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,
    UseGuards,
} from '@nestjs/common';

import { CreateDataFieldDto } from './dto/create-datafield.dto';
import { UpdateDataFieldDto } from './dto/update-datafield.dto';
import { CreateValidDataDto } from './dto/create-validdata.dto';

import { DatafileService } from './datafile.service';
import { CreateDataFileDto } from './dto/create-datafile.dto';
import { AuthGuard } from 'src/auth/gaurds/gaurds';
import { UpdateDataFileDto } from './dto/update-datafile.dto';
import { UpdateValidDataDto } from './dto/update-validdata.dto';
import { userType } from 'src/auth/dto/auth.dto';

@Controller('api/datafiles')
@UseGuards(AuthGuard)

export class DatafileController {
    constructor(private readonly datafileService: DatafileService) { }

    @Post()
    createDataFile(@Body() createDataFileDto: CreateDataFileDto, @Req() req: userType) {
        const userId = req.user.username
        // Service now handles validation
        return this.datafileService.createDataFile(createDataFileDto, userId);
    }

    @Patch(':id')
    updateDataFile(
        @Param('id') id: string,
        @Body() updateDataFileDto: UpdateDataFileDto,
        @Req() req: userType,
    ) {
        const userId = req.user.username;
        return this.datafileService.updateDataFile(id, updateDataFileDto, userId);
    }

    @Post(':fileId/fields')
    createDataField(
        @Param('fileId') fileId: string,
        @Body() createDataFieldDto: CreateDataFieldDto,
        @Req() req: userType,
    ) {
        const userId = req.user.username;
        return this.datafileService.createDataField(fileId, createDataFieldDto, userId);
    }

    @Patch(':fileId/fields/:fieldId')
    updateDataField(
        @Param('fileId') fileId: string,
        @Param('fieldId') fieldId: string,
        @Body() updateDataFieldDto: UpdateDataFieldDto,
        @Req() req: userType,
    ) {
        const userId = req.user.username;
        return this.datafileService.updateDataField(fieldId, updateDataFieldDto, userId);
    }


    @Post(':fileId/fields/:fieldId/validdata')
    createValidData(
        @Param('fieldId') fieldId: string,
        @Body() createValidDataDto: CreateValidDataDto,
        @Req() req,
    ) {
        const userId = req.user.id;
        return this.datafileService.createValidData(fieldId, createValidDataDto, userId);
    }


    @Patch(':fileId/fields/:fieldId/validdata/:validDataId')
    updateValidData(
        @Param('validDataId') validDataId: string,
        @Body() updateValidDataDto: UpdateValidDataDto,
        @Req() req: userType,
    ) {
        const userId = req.user.username;
        return this.datafileService.updateValidData(validDataId, updateValidDataDto, userId);
    }


    @Get()
    findAllDataFiles(@Req() req) {
        const userId = req.user.id;
        return this.datafileService.findAllDataFiles(userId);
    }

    @Get(':id')
    findOneDataFile(@Param('id') id: string, @Req() req) {
        const userId = req.user.id;
        return this.datafileService.findOneDataFile(id, userId);
    }

    @Delete(':id')
    deleteDataFile(@Param('id') id: string, @Req() req: userType) {
        const userId = req.user.username;
        return this.datafileService.deleteDataFile(id, userId);
    }


    @Delete(':fileId/fields/:fieldId')
    deleteDataField(
        @Param('fileId') fileId: string,
        @Param('fieldId') fieldId: string,
        @Req() req: userType,
    ) {
        const userId = req.user.username;
        return this.datafileService.deleteDataField(fieldId, userId);
    }

    @Delete(':fileId/fields/:fieldId/validdata/:validDataId')
    deleteValidData(
        @Param('validDataId') validDataId: string,
        @Req() req: userType,
    ) {
        const userId = req.user.username;
        return this.datafileService.deleteValidData(validDataId, userId);
    }
}