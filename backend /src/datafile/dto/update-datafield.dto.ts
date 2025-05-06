

export class UpdateDataFieldDto {
    fieldName?: string;
    description?: string;

    fieldType?: string;
    fieldSize?: number; // Note: Changing size requires recalculating positions
    packed?: boolean;
    validDataNotes?: string;
    archive?: boolean;
}