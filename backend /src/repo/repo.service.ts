import { Injectable, NotFoundException } from '@nestjs/common';
import { createRepoDTO } from './dto/repo.dto';
import { PrismaService } from 'prisma/prisma.service';
import { userType } from 'src/auth/dto/auth.dto';
import { ResponseDTO } from 'src/auth/dto/response.dto';
import * as fs from 'fs'
import * as path from 'path'
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class RepoService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly logger: LoggerService
    ) { }
    async createRepo(repo: createRepoDTO, req: userType): Promise<ResponseDTO> {
        const user = req.user.username
        let { reponame, description, language } = repo
        if (!reponame || !description || !language) {
            return {
                code: 400,
                message: 'Please provide all required fields',
                data: null
            }
        }

        if (reponame.length < 3) {
            return {
                code: 400,
                message: 'Repo name must be at least 3 characters long',
                data: null
            }
        }

        if (description.length < 10) {
            return {
                code: 400,
                message: 'Description must be at least 10 characters long',
                data: null
            }
        }
        let checkRepo = await this.prismaService.repository.findMany({
            where: {
                name: {
                    equals: reponame
                }
            }
        })

        if (checkRepo.length > 0) {
            return {
                code: 400,
                message: 'Change repo name, this repo name already exists',
                data: null
            }
        }

        // if the repo name has spaces add - in between the spaces
        if (reponame.includes(' ')) {
            reponame = reponame.replace(/ /g, '-')
        }
        await this.prismaService.repository.create({
            data: {
                name: reponame,
                description: description,
                language: language,
                createdAt: new Date(),
                updatedAt: new Date(),
                user: {
                    connect: {
                        username: user
                    }
                }
            }
        })

        this.logger.log(`Repo created with name ${reponame}`, user)

        return {
            code: 200,
            message: 'Repo created successfully',
            data: repo
        }
    }

    async getAllRepo(req: userType): Promise<ResponseDTO> {
        try {
            const repo = await this.prismaService.repository.findMany({
                orderBy: {
                    updatedAt: 'desc'
                },
                select: {
                    name: true,
                    description: true,
                    language: true,

                    user: {
                        select: {
                            name: true,
                            username: true,

                        }
                    },
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                }
            })

            if (repo.length === 0) {
                throw new NotFoundException('No repo found')
            }

            return {
                code: 200,
                message: 'Repo found successfully',
                data: repo
            }
        } catch (error) {
            throw error
        }
    }



    async getRepo(req: userType, reponame: string): Promise<ResponseDTO> {
        try {
            if (!reponame) {
                throw new NotFoundException('Please provide repo name')
            }
            let repo = await this.prismaService.repository.findUnique({
                where: {
                    name: reponame,
                },
                select: {
                    files: {},
                    issue: true,
                    documentation: true,
                    name: true,
                    description: true,
                    id: true,
                    user: {
                        select: {
                            name: true,
                        }
                    }
                }

            })

            if (!repo) {
                throw new NotFoundException('No repo found')
            }
            return {
                code: 200,
                message: 'Repo found successfully',
                data: repo
            }

        } catch (error) {
            throw error
        }
    }


    async addFile(
        req: userType,
        reponame: string,
        file: Express.Multer.File,
        filename: string,
        description: string
    ): Promise<ResponseDTO | any> {
        try {
            if (!reponame) throw new NotFoundException('Please provide repo name')
            if (!description) throw new NotFoundException('Please provide description')
            if (!filename) throw new NotFoundException('Please provide file name')
            if (!file) throw new NotFoundException('Please provide file')
            if (file.size > 50 * 1024 * 1024) throw new NotFoundException('File size is too large')

            const repo = await this.prismaService.repository.findUnique({
                where: { name: reponame }
            })

            if (!repo) throw new NotFoundException('No repo found')

            // Extract extension and clean filename
            const originalExt = path.extname(file.originalname)
            const baseFilename = path.basename(filename, path.extname(filename))
            const uploadsDir = path.join(process.cwd(), '..', '..', 'uploads')
            const repoDir = path.join(uploadsDir, reponame)

            // Ensure folders exist
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir)
            }

            if (!fs.existsSync(repoDir)) {
                fs.mkdirSync(repoDir)
            }

            // Auto-rename logic
            let finalFilename = `${baseFilename}${originalExt}`
            let finalPath = path.join(repoDir, finalFilename)
            let counter = 1

            while (fs.existsSync(finalPath)) {
                finalFilename = `${baseFilename}_${counter}${originalExt}`
                finalPath = path.join(repoDir, finalFilename)
                counter++
            }

            // Save file
            fs.writeFileSync(finalPath, file.buffer)

            const fileSize = file.size / 1024 / 1024 // MB
            const fileExtension = originalExt.replace('.', '') // "pdf", "txt", etc.


            await this.prismaService.files.create({
                data: {
                    Repository: {
                        connect: { name: reponame }
                    },
                    name: finalFilename,
                    size: fileSize,
                    type: fileExtension,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    path: `uploads/${reponame}/${finalFilename}`,
                    description: description
                }
            })


            await this.prismaService.repository.update({
                where: { name: reponame },
                data: {
                    updatedAt: new Date(),
                }
            })

            this.logger.log(`File added with name ${finalFilename}`, req.user.username)
            return {
                code: 200,
                message: 'File added successfully',
                data: `uploads/${reponame}/${finalFilename}`
            }

        } catch (error) {
            throw error
        }
    }


    async searchRepo(req: userType, reponame: string): Promise<ResponseDTO> {
        try {
            if (!reponame) {
                throw new NotFoundException('Please provide a repo name');
            }

            const repos = await this.prismaService.repository.findMany({
                where: {
                    name: {
                        contains: reponame,
                        mode: 'insensitive'
                    }
                }
            });

            return {
                code: 200,
                message: repos.length ? 'Repositories found successfully' : 'No matching repositories found',
                data: repos
            };
        } catch (error) {
            return {
                code: 500,
                message: error.message || 'Internal Server Error',
                data: null
            };
        }
    }



    async addDocumentation(
        req: userType,
        repoid: string,
        documentation: string
    ): Promise<ResponseDTO> {


        try {

            if (!repoid) throw new NotFoundException('Please provide repo name')
            let check = await this.prismaService.repository.findUnique({
                where: {
                    name: repoid
                }
            })

            if (!check) throw new NotFoundException('No repo found')

            if (!documentation) throw new NotFoundException('Please provide documentation')


            await this.prismaService.repository.update({
                where: {
                    name: repoid
                },
                data: {
                    documentation: documentation,
                    updatedAt: new Date()
                }
            })



            this.logger.log(`Documentation added to repo ${repoid}`, req.user.username)

            return {
                code: 200,
                message: 'Documentation added successfully',
                data: null
            }


        } catch (error) {
            throw error

        }
    }




    async askAI(reponame: string) {
        try {
            const repo = await this.prismaService.repository.findUnique({
                where: {
                    name: reponame
                },
                select: {
                    files: true,
                    description: true,
                    documentation: true,
                    name: true,
                }
            });

            if (!repo) throw new NotFoundException('No repo found');

            const filesArr = repo.files.map(file => ({
                title: file.name,
                type: file.type,
                description: file.description,
            }));

            const prompt = `
            You are an expert AI assistant. A developer who has never seen this project before is trying to understand the code repository below.
            
            Your job is to help them **clearly and simply** understand what the project is, what it does, and how to get started using it.
            
            ---
            
            🗂️ Repository Name: ${repo.name}
            
            📝 Description:
            ${repo.description || 'No description provided.'}
            
            📚 Documentation (Markdown):
            ${repo.documentation || 'No documentation provided.'}
            
            📁 Files:
            ${filesArr.map((f, i) => `  ${i + 1}. ${f.title} (${f.type}) - ${f.description || 'No description'}`).join('\n')}
            
            ---
            
            👨‍💻 What you should do:
            
            1. **Explain what this repository is, in simple terms.**
            2. **Describe the main purpose of this project.**
            3. **Guide a beginner on how to start using this repo — step-by-step.**
            4. **Point out anything confusing or missing, especially in the documentation.**
            5. **If possible, suggest improvements to help first-time users.**
            
            Keep it concise, beginner-friendly, and welcoming to someone unfamiliar with the repo or codebase.
            `;


            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAzY7jd-yLCxmoIGcJJoTsbdAsSacWkXTw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ]
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error(result);
                throw new Error(result.error?.message || 'Failed to generate response from Gemini');
            }

            const reply = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
            console.log("AI Response:\n", reply);

            return {
                code: 200,
                message: 'AI response generated successfully',
                data: reply
            }
        } catch (error) {
            console.error("askAI error:", error);
            throw error;
        }
    }


}
