import { useEffect, useState } from "react"
import type { Project } from "../types"
import { Loader2Icon } from "lucide-react"
import ProjectCard from "../components/ProjectCard"
import api from "../configs/axios"
import toast from "react-hot-toast"

const Community = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)\n  const [loadError, setLoadError] = useState(false)

  const fetchProjects = async ()=>{
    try {
      const { data } = await api.get('/api/project/published')
      setProjects(data.projects || [])
      setLoadError(false)
    } catch (error: any) {
      setLoadError(true)
      toast.error(
        error?.response?.data?.message ||
        (error?.code === "ERR_NETWORK"
          ? "The AI Maker API is unavailable right now. Please retry shortly."
          : error?.message || "Could not load community projects.")
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    fetchProjects()
  },[])

  return loading ? (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2Icon className='size-7 animate-spin text-indigo-400'/>
    </div>
  ) : (
    <div className="min-h-screen text-white p-6 md:p-12 my-28">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold mb-4">Community</h1>
          <p className="text-gray-400">See what others are creating with AI Maker</p>
        </header>

        {loadError ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-gray-300 mb-4">The community gallery couldn't be loaded.</p>
            <button onClick={() => { setLoading(true); fetchProjects(); }} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium hover:bg-indigo-500">
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No public creations yet</h2>
            <p className="text-gray-400 mb-5">Be the first to share an AI Maker creation with the community.</p>
            <a href="/generate" className="inline-flex rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium hover:bg-indigo-500">
              Create your first image
            </a>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {projects.map((project)=>(
                <ProjectCard key={project.id} gen={project} setGenerations={setProjects} forCommunity={true}/>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Community
