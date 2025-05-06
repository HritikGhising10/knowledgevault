import { PartialType } from '@nestjs/mapped-types';
import { CreateDataFileDto } from './create-datafile.dto';

// Allows all fields from CreateDataFileDto to be optional
export class UpdateDataFileDto extends PartialType(CreateDataFileDto) { }