import { issueType } from "@prisma/client";

export interface CreateIssueDto {
    title: string;
    issue_type: issueType;
    description: string;
    repoid: string;
}