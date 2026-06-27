import { env } from '@/lib/env'
import type { RenderMode } from '@/lib/pipeline/types'

interface DispatchRenderInput {
  projectId: string
  jobId: string
  mode: RenderMode
  sceneIds?: string[]
}

export async function dispatchRenderWorkflow(input: DispatchRenderInput) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO are required to dispatch render workflow')
  }

  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'render_video',
      client_payload: {
        project_id: input.projectId,
        job_id: input.jobId,
        mode: input.mode,
        scene_ids: input.sceneIds ?? null,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub dispatch failed: ${response.status} ${response.statusText}`)
  }
}

export async function dispatchAiPipeline(projectId: string, baseUrl: string) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO are required to dispatch AI pipeline')
  }

  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'run_ai_pipeline',
      client_payload: {
        project_id: projectId,
        base_url: baseUrl,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub AI pipeline dispatch failed: ${response.status} ${response.statusText}`)
  }
}
