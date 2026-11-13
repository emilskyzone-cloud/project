import {Request, Response } from 'express'
import * as Sentry from "@sentry/node";
import { prisma } from '../configs/prisma.js';
import {v2 as cloudinary } from 'cloudinary'
import {GenerateContentConfig, HarmBlockThreshold, HarmCategory} from '@google/genai'
import fs from 'fs';
import path from 'path';
import ai from '../configs/ai.js';
import axios from 'axios';

const loadImage = (path: string, mimeType: string)=>{
    return {
        inlineData: {
            data: fs.readFileSync(path).toString('base64'),
            mimeType
        }
    }
}


export const createProject = async (req: Request, res: Response) => {
    const { userId } = req.auth();
    const {
        name = "New Project",
        aspectRatio,
        userPrompt,
        productName,
        productDescription,
        targetLength = 5,
    } = req.body;

    const images: any[] = Array.isArray(req.files) ? (req.files as any[]) : [];
    let tempProjectId: string | undefined;
    let isCreditDeducted = false;

    try {
        if (images.length !== 2 || !String(productName || "").trim()) {
            return res.status(400).json({
                message: "Please upload exactly two images and enter a product name.",
            });
        }

        // Decrement only when the balance is still sufficient. This avoids
        // concurrent requests taking a balance below zero.
        const deduction = await prisma.user.updateMany({
            where: { id: userId, credits: { gte: 5 } },
            data: { credits: { decrement: 5 } },
        });

        if (deduction.count !== 1) {
            return res.status(401).json({ message: "Insufficient credits" });
        }
        isCreditDeducted = true;

        const uploadedImages = await Promise.all(
            images.map(async (item: any) => {
                const result = await cloudinary.uploader.upload(item.path, {
                    resource_type: "image",
                });
                return result.secure_url;
            })
        );

        const project = await prisma.project.create({
            data: {
                name,
                userId,
                productName,
                productDescription,
                userPrompt,
                aspectRatio,
                targetLength: Number.parseInt(String(targetLength), 10) || 5,
                uploadedImages,
                isGenerating: true,
            },
        });

        tempProjectId = project.id;

        const model = "gemini-3.1-flash-image";
        const generationConfig: GenerateContentConfig = {
            maxOutputTokens: 32768,
            temperature: 1,
            topP: 0.95,
            responseModalities: ["IMAGE"],
            imageConfig: {
                aspectRatio: aspectRatio || "9:16",
                imageSize: "1K",
            },
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.OFF,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.OFF,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.OFF,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.OFF,
                },
            ],
        };

        const img1base64 = loadImage(images[0].path, images[0].mimetype);
        const img2base64 = loadImage(images[1].path, images[1].mimetype);

        const prompt = {
            text: `Combine the person and product into a realistic photo.
Make the person naturally hold or use the product.
Match lighting, shadows, scale and perspective.
Make the person stand in professional studio lighting.
Output ecommerce-quality photo realistic imagery.
${userPrompt || ""}`,
        };

        const response: any = await ai.models.generateContent({
            model,
            contents: [img1base64, img2base64, prompt],
            config: generationConfig,
        });

        const parts = response?.candidates?.[0]?.content?.parts;
        if (!parts) {
            throw new Error("The image provider returned an unexpected response.");
        }

        let finalBuffer: Buffer | null = null;
        for (const part of parts) {
            if (part.inlineData?.data) {
                finalBuffer = Buffer.from(part.inlineData.data, "base64");
            }
        }

        if (!finalBuffer) {
            throw new Error("The image provider did not return an image.");
        }

        const base64Image = `data:image/png;base64,${finalBuffer.toString("base64")}`;
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            resource_type: "image",
        });

        await prisma.project.update({
            where: { id: project.id },
            data: {
                generatedImage: uploadResult.secure_url,
                isGenerating: false,
                error: "",
            },
        });

        return res.json({ projectId: project.id });
    } catch (error: any) {
        if (tempProjectId) {
            await prisma.project.updateMany({
                where: { id: tempProjectId, userId },
                data: {
                    isGenerating: false,
                    error: error?.message || "Image generation failed",
                },
            }).catch(() => undefined);
        }

        if (isCreditDeducted) {
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } },
            }).catch(() => undefined);
        }

        Sentry.captureException(error);
        return res.status(500).json({
            message: error?.message || "Image generation failed. Please retry.",
        });
    } finally {
        // Render's free filesystem is ephemeral and small; never accumulate
        // customer uploads on the API container.
        await Promise.all(
            images.map(async (item: any) => {
                if (item?.path) {
                    await fs.promises.unlink(item.path).catch(() => undefined);
                }
            })
        );
    }
};

export const createVideo = async (req: Request, res: Response) => {
    const { userId } = req.auth();
    const { projectId } = req.body;
    let isCreditDeducted = false;
    let projectLocked = false;
    let filePath: string | undefined;

    try {
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        if (project.isGenerating) {
            return res.status(409).json({ message: "A generation is already in progress" });
        }
        if (project.generatedVideo) {
            return res.status(409).json({ message: "This project already has a video" });
        }
        if (!project.generatedImage) {
            return res.status(409).json({ message: "Generate an image before creating a video" });
        }

        // Atomically claim the project so rapid double-clicks cannot launch
        // two paid video generations for the same project.
        const lock = await prisma.project.updateMany({
            where: {
                id: projectId,
                userId,
                isGenerating: false,
                generatedVideo: "",
            },
            data: { isGenerating: true },
        });

        if (lock.count !== 1) {
            return res.status(409).json({ message: "A generation is already in progress" });
        }
        projectLocked = true;

        const deduction = await prisma.user.updateMany({
            where: { id: userId, credits: { gte: 10 } },
            data: { credits: { decrement: 10 } },
        });

        if (deduction.count !== 1) {
            await prisma.project.updateMany({
                where: { id: projectId, userId, isGenerating: true },
                data: { isGenerating: false },
            });
            projectLocked = false;
            return res.status(401).json({ message: "Insufficient credits" });
        }
        isCreditDeducted = true;

        const prompt = `make the person showcase the product which is ${project.productName} ${project.productDescription ? `and Product Description: ${project.productDescription}` : ""}`;
        const model = "veo-3.1-generate-preview";

        const image = await axios.get(project.generatedImage, {
            responseType: "arraybuffer",
            timeout: 30000,
        });
        const imageBytes = Buffer.from(image.data);

        let operation: any = await ai.models.generateVideos({
            model,
            prompt,
            image: {
                imageBytes: imageBytes.toString("base64"),
                mimeType: "image/png",
            },
            config: {
                aspectRatio: project.aspectRatio || "9:16",
                numberOfVideos: 1,
                resolution: "720p",
            },
        });

        while (!operation.done) {
            console.log("Waiting for video generation to complete...");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({
                operation,
            });
        }

        const filename = `${userId}-${Date.now()}.mp4`;
        filePath = path.join("videos", filename);
        fs.mkdirSync("videos", { recursive: true });

        const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
        if (!generatedVideo) {
            const reason = operation.response?.raiMediaFilteredReasons?.[0];
            throw new Error(reason || "The video provider did not return a video.");
        }

        await ai.files.download({
            file: generatedVideo,
            downloadPath: filePath,
        });

        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: "video",
        });

        await prisma.project.update({
            where: { id: project.id },
            data: {
                generatedVideo: uploadResult.secure_url,
                isGenerating: false,
                error: "",
            },
        });
        projectLocked = false;

        return res.json({
            message: "Video generation completed",
            videoUrl: uploadResult.secure_url,
        });
    } catch (error: any) {
        if (projectLocked) {
            await prisma.project.updateMany({
                where: { id: projectId, userId },
                data: {
                    isGenerating: false,
                    error: error?.message || "Video generation failed",
                },
            }).catch(() => undefined);
        }

        if (isCreditDeducted) {
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 10 } },
            }).catch(() => undefined);
        }

        Sentry.captureException(error);
        return res.status(500).json({
            message: error?.message || "Video generation failed. Please retry.",
        });
    } finally {
        if (filePath) {
            await fs.promises.unlink(filePath).catch(() => undefined);
        }
    }
};

export const getAllPublishedProjects = async (req:Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            where: {isPublished: true}
        })
        res.json({projects})

    } catch (error:any) {
        Sentry.captureException(error);
        res.status(500).json({ message: error.message });
    }
}

export const deleteProject = async (req:Request, res: Response) => {
    try {
        const { userId } = req.auth();
        const { projectId } = req.params;

        const project = await prisma.project.findUnique({
            where: {id: projectId, userId}
        })

         if (!project){
            return res.status(404).json({ message: 'Project not found' });
         }

         await prisma.project.delete({
            where: {id: projectId}
         })

         res.json({ message: 'Project deleted' });

    } catch (error:any) {
        Sentry.captureException(error);
        res.status(500).json({ message: error.message });
    }
}
