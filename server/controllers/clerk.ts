import { Request, Response } from "express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { prisma } from "../configs/prisma.js";
import * as Sentry from "@sentry/node";

const clerkWebhooks = async (req: Request, res: Response) => {
    try {
        const eventId = req.header("svix-id");
        if (!eventId) {
            return res.status(400).json({ message: "Missing webhook event ID" });
        }

        const evt: any = await verifyWebhook(req);
        const { data, type } = evt;

        // Clerk/Svix may retry delivery. Store its event ID in the same
        // transaction as the side effect so one payment cannot grant credits twice.
        await prisma.$transaction(async (tx) => {
            await tx.processedWebhookEvent.create({
                data: { id: eventId, type },
            });

            switch (type) {
                case "user.created":
                case "user.updated": {
                    const email =
                        data?.email_addresses?.find(
                            (item: any) => item.id === data.primary_email_address_id
                        )?.email_address ||
                        data?.email_addresses?.[0]?.email_address;

                    if (!email) {
                        throw new Error("Clerk user event did not include an email address");
                    }

                    const profile = {
                        email,
                        name:
                            [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
                            "User",
                        image: data?.image_url || "",
                    };

                    await tx.user.upsert({
                        where: { id: data.id },
                        update: profile,
                        create: {
                            id: data.id,
                            ...profile,
                            credits: 5,
                        },
                    });
                    break;
                }

                case "user.deleted": {
                    await tx.user.deleteMany({ where: { id: data.id } });
                    break;
                }

                case "paymentAttempt.updated": {
                    if (
                        (data?.charge_type === "recurring" ||
                            data?.charge_type === "checkout") &&
                        data?.status === "paid"
                    ) {
                        const creditsByPlan: Record<string, number> = {
                            pro: 80,
                            premium: 240,
                        };
                        const clerkUserId = data?.payer?.user_id;
                        const planId = data?.subscription_items?.[0]?.plan?.slug;
                        const creditAmount = creditsByPlan[planId];

                        if (!clerkUserId || !creditAmount) {
                            throw new Error("Paid event has a missing user or unsupported plan");
                        }

                        const updated = await tx.user.updateMany({
                            where: { id: clerkUserId },
                            data: { credits: { increment: creditAmount } },
                        });

                        if (updated.count !== 1) {
                            throw new Error("Cannot credit payment: customer account was not found");
                        }
                    }
                    break;
                }

                default:
                    break;
            }
        });

        return res.json({ message: "Webhook received: " + type });
    } catch (error: any) {
        // A duplicate Svix ID means this exact event was already committed.
        if (error?.code === "P2002") {
            return res.status(200).json({ message: "Webhook event already processed" });
        }

        Sentry.captureException(error);
        return res.status(500).json({ message: "Webhook processing failed" });
    }
};

export default clerkWebhooks;
