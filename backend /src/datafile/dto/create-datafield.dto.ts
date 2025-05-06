import { FieldType } from "@prisma/client";


export class CreateDataFieldDto {
    fieldName: string;
    description?: string;
    fieldSize: number;
    packed?: boolean = false;
    validDataNotes?: string;
    fieldType: FieldType;
    archive?: boolean = false;

}