import { useEffect, useState } from "react";
import type { Project } from "../types";
import { ImageIcon, Loader2Icon, RefreshCwIcon, SparkleIcon, VideoIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GhostButton, PrimaryButton } from "../components/Buttons";
import { useAuth, useUser } from "@clerk/clerk-react";
import api from "../configs/axios";
import toast from "react-hot-toast";

const Result = () => {
    const { projectId } = useParams();
    const { getToken } = useAuth();
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();

    const [project, setProjectData] = useState<Project>({} as Project);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchProjectData = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get(`/api/user/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProjectData(data.project);
            setIsGenerating(data.project.isGenerating);
            setLoadError(false);
        } catch (error: any) {
            setLoadError(true);
            toast.error(
                error?.response?.data?.message ||
                (error?.code === "ERR_NETWORK"
                    ? "The AI Maker API is unavailable right now. Please retry shortly."
                    : error?.message || "Could not load this generation.")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateVideo = async () => {
        setIsGenerating(true);
        try {
            const token = await getToken();
            const { data } = await api.post(
                "/api/project/video",
                { projectId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setProjectData((prev) => ({
                ...prev,
                generatedVideo: data.videoUrl,
                isGenerating: false,
            }));
            toast.success(data.message || "Video generation completed");
            setIsGenerating(false);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                (error?.code === "ERR_NETWORK"
                    ? "The video request lost its connection. Checking the project status now."
                    : error?.message || "Video generation failed.")
            );
            // The server may still be processing after a lost connection.
            // Reload its state before enabling another paid generation.
            await fetchProjectData();
        }
    };

    useEffect(() => {
        if (user && !project.id) {
            fetchProjectData();
        } else if (isLoaded && !user) {
            navigate("/");
        }
    }, [user]);

    useEffect(() => {
        if (user && isGenerating) {
            const interval = setInterval(() => {
                fetchProjectData();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [user, isGenerating]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader2Icon className="animate-spin text-indigo-400 size-9" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
                <p className="text-gray-300 mb-4">This generation couldn't be loaded.</p>
                <PrimaryButton onClick={() => { setLoading(true); fetchProjectData(); }}>
                    Try again
                </PrimaryButton>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white p-6 md:p-12 mt-20">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-medium">Generation Result</h1>
                    <Link to="/generate" className="btn-secondary text-sm flex items-center gap-2">
                        <RefreshCwIcon className="w-4 h-4" />
                        <p className="max-sm:hidden">New Generation</p>
                    </Link>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel inline-block p-2 rounded-2xl">
                            <div className={`${project?.aspectRatio === "9:16" ? "aspect-9/16" : "aspect-video"} sm:max-h-200 rounded-xl bg-gray-900 overflow-hidden relative`}>
                                {project?.generatedVideo ? (
                                    <video src={project.generatedVideo} controls autoPlay loop className="w-full h-full object-cover" />
                                ) : project?.generatedImage ? (
                                    <img src={project.generatedImage} alt="Generated Result" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30">
                                        <Loader2Icon className="size-8 animate-spin text-indigo-400" />
                                        <p className="text-sm text-gray-300">Your image is being generated…</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="text-xl font-semibold mb-4">Actions</h3>
                            <div className="flex flex-col gap-3">
                                <a href={project.generatedImage ? project.generatedImage.replace("/upload", "/upload/fl_attachment") : undefined} download>
                                    <GhostButton disabled={!project.generatedImage} className="w-full justify-center rounded-md py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <ImageIcon className="size-4.5" />
                                        Download Image
                                    </GhostButton>
                                </a>
                                <a href={project.generatedVideo ? project.generatedVideo.replace("/upload", "/upload/fl_attachment") : undefined} download>
                                    <GhostButton disabled={!project.generatedVideo} className="w-full justify-center rounded-md py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <VideoIcon className="size-4.5" />
                                        Download Video
                                    </GhostButton>
                                </a>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <VideoIcon className="size-24" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Video generation</h3>
                            <p className="text-gray-400 text-sm mb-6">Turn this generated image into a short-form video for social media. Video generation uses 10 credits.</p>
                            {!project.generatedVideo ? (
                                <PrimaryButton onClick={handleGenerateVideo} disabled={isGenerating || !project.generatedImage} className="w-full">
                                    {isGenerating ? "Generating video…" : (
                                        <>
                                            <SparkleIcon className="size-4" />
                                            Generate video
                                        </>
                                    )}
                                </PrimaryButton>
                            ) : (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-center text-sm font-medium">
                                    Video generated successfully
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Result;
