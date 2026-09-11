import {Request, Response} from 'express'
import * as Sentry from "@sentry/node";
import { clerkClient } from '@clerk/express';
import { prisma } from '../configs/prisma.js';

// Get User Credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {

        const {userId} = req.auth();
        if(!userId) {return res.status(401).json({message: 'Unauthorized'})}

        let user = await prisma.user.findUnique({
            where: {id: userId}
        })
        if (!user) {
            const profile = await clerkClient.users.getUser(userId);
            const email = profile.primaryEmailAddress?.emailAddress ||
                profile.emailAddresses[0]?.emailAddress;
            if (!email) {
                return res.status(409).json({message: 'Please add an email address to your account'});
            }
            user = await prisma.user.upsert({
                where: {id: userId},
                update: {},
                create: {
                    id: userId,
                    email,
                    name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User',
                    image: profile.imageUrl || '',
                    credits: 5,
                },
            });
        }
        res.json({credits: user.credits})

    } catch (error: any) {
        Sentry.captureException(error);
        res.status(500).json({message: error.code || error.message})
    }
}

//  const get all user projects
export const getAllProjects = async (req: Request, res: Response) => {
    try {

        const {userId} = req.auth();
        const projects = await prisma.project.findMany({
            where: {userId},
            orderBy: {createdAt: 'desc'}
        })
        res.json({projects})

    } catch (error: any) {
        Sentry.captureException(error);
        res.status(500).json({message: error.code || error.message})
    }
}

// get project by id
export const getProjectById = async (req: Request, res: Response) => {
    try {

        const {userId} = req.auth();
        const {projectId} = req.params;

        const project = await prisma.project.findUnique({
            where: {id: projectId, userId}
        })

        if(!project) { return res.status(404).json({message: 'Project not found' })}

        res.json({project})
        
    } catch (error: any) {
        Sentry.captureException(error);
        res.status(500).json({message: error.code || error.message})
    }
}

// publish / unpublish project
export const toggleProjectPublic = async (req: Request, res: Response) => {
    try {
        
        const {userId} = req.auth();
        const {projectId} = req.params;

        const project = await prisma.project.findUnique({
            where: {id: projectId, userId}
        })

        if(!project) { return res.status(404).json({message: 'Project not found' })}

        if(!project?.generatedImage && !project?.generatedVideo){
            return res.status(404).json({message: 'image or video not generated'})
        }

        await prisma.project.update({
            where: {id: projectId},
            data: {isPublished: !project.isPublished}
        })

        res.json({isPublished: !project.isPublished})

    } catch (error: any) {
        Sentry.captureException(error);
        res.status(500).json({message: error.code || error.message})
    }
}
