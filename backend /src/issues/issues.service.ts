import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateIssueDto } from './dto/issue.dto';
import { ResponseDTO } from 'src/auth/dto/response.dto';
import { userType } from 'src/auth/dto/auth.dto';
import { PrismaService } from 'prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class IssuesService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService
    ) { }

    async createIssue(createIssue: CreateIssueDto, req: userType): Promise<ResponseDTO> {
        try {
            if (!createIssue.description || !createIssue.issue_type || !createIssue.title) {
                throw new UnauthorizedException("Please fill all the fields");
            }

            await this.prisma.issue.create({
                data: {
                    title: createIssue.title,
                    description: createIssue.description,
                    issueType: createIssue.issue_type,
                    status: "OPEN",
                    user: {
                        connect: {
                            username: req.user.username
                        }
                    },
                    repository: {
                        connect: {
                            id: createIssue.repoid
                        }
                    }
                },
            })

            this.logger.log(`Issue created with title ${createIssue.title}`, req.user.username)

            return {
                code: 200,
                message: "Issue created successfully",
                data: null
            }
        } catch (error) {
            throw error
        }

    }


    async getAllIssues(req: userType): Promise<ResponseDTO> {
        try {
            const issues = await this.prisma.issue.findMany({
                select: {
                    repository: {
                        select: {
                            name: true,
                            id: true,
                        },

                    },
                    user: {
                        select: {
                            username: true
                        }
                    },
                    createdAt: true,
                    issueType: true,

                },
                orderBy: {
                    createdAt: "desc"
                },

            })

            return {
                code: 200,
                message: "Issues fetched successfully",
                data: issues
            }
        } catch (error) {
            throw error
        }
    }


    async getIssuesByRepoId(req: userType, repoid: string): Promise<ResponseDTO> {
        try {
            const issues = await this.prisma.issue.findMany({
                where: {
                    repository: {
                        id: repoid
                    }
                },
                select: {
                    title: true,
                    description: true,
                    id: true,
                    issueType: true,
                    repository: {
                        select: {
                            name: true
                        }
                    },
                    status: true,
                    createdAt: true,
                    user: {
                        select: {
                            username: true
                        }
                    }
                }
            })
            let reponame = issues[0].repository.name

            return {
                code: 200,

                message: "Issues fetched successfully",
                data: {
                    issues: issues,
                    reponame: reponame
                }
            }
        } catch (error) {
            throw error
        }
    }


    async getIssueById(req: userType, issueid: string): Promise<ResponseDTO> {
        try {
            const issue = await this.prisma.issue.findUnique({
                where: {
                    id: issueid
                },
                select: {
                    title: true,
                    description: true,
                    id: true,
                    issueType: true,
                    repository: {
                        select: {
                            name: true
                        }
                    },
                    status: true,
                    createdAt: true,
                    user: {
                        select: {
                            username: true
                        }
                    },
                    comment: {
                        select: {
                            id: true,
                            description: true,
                            createdAt: true,
                            user: {
                                select: {
                                    username: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    }
                }
            })

            return {
                code: 200,
                message: "Issue fetched successfully",
                data: issue
            }
        } catch (error) {
            throw error
        }
    }


    async addComment(req: userType, issueid: string, comment: string): Promise<ResponseDTO> {
        try {

            if (!comment) {
                throw new UnauthorizedException("Please fill all the fields");
            }

            await this.prisma.comment.create({
                data: {
                    description: comment,
                    user: {
                        connect: {
                            username: req.user.username
                        }
                    },

                    issue: {
                        connect: {
                            id: issueid
                        }
                    },

                },
            })
            this.logger.log(`Comment added to issue with id ${issueid}`, req.user.username)
            return {
                code: 200,
                message: "Comment added successfully",
                data: null
            }

        } catch (error) {
            throw error
        }
    }


    async searchIssue(req: userType, query: string): Promise<ResponseDTO> {
        try {
            const trimmedQuery = query?.trim();
            if (!trimmedQuery) {
                throw new NotFoundException('Please provide a valid search keyword');
            }

            const issues = await this.prisma.issue.findMany({
                where: {
                    OR: [
                        {
                            title: {
                                contains: trimmedQuery,
                                mode: 'insensitive',
                            },
                        },
                        {
                            description: {
                                contains: trimmedQuery,
                                mode: 'insensitive',
                            },
                        },
                        {
                            repository: {
                                name: {
                                    contains: trimmedQuery,
                                    mode: 'insensitive',
                                },
                            },
                        },
                        {
                            user: {
                                username: {
                                    contains: trimmedQuery,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    ],
                },
                select: {
                    repository: {
                        select: {
                            name: true,
                            id: true,
                        },
                    },
                    user: {
                        select: {
                            username: true,
                        },
                    },
                    createdAt: true,
                    issueType: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return {
                code: 200,
                message: issues.length ? 'Issues found successfully' : 'No matching issues found',
                data: issues,
            };
        } catch (error) {
            console.error('Search failed:', error);
            throw new Error('An error occurred while searching for issues');
        }
    }


}

