

export class CreateDataFileDto {
    shortName: string;
    longName: string;
    fileLocation?: string;
    fileSize: number;
    docLink?: string;
    archive?: boolean = false;

}