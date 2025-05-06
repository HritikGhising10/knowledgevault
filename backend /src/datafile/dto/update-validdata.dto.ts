import { PartialType } from '@nestjs/mapped-types';
import { CreateValidDataDto } from './create-validdata.dto';

// Allows all fields from CreateValidDataDto to be optional
export class UpdateValidDataDto extends PartialType(CreateValidDataDto) { }