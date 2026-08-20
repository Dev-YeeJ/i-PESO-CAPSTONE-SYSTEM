import { useMutation, useQueryClient } from '@tanstack/react-query'
import { seekerService, type NearbyJob, type NearbyJobsResponse } from '@/services/seekerService'

const JOB_LIST_QUERY_KEYS = ['jobs', 'jobMap'] as const

/**
 * Shared save/unsave mutation for every screen that shows a job card (flat
 * list, map, detail) — a job's saved state is global, so all three need to
 * agree on it instead of each keeping its own copy-pasted mutation with its
 * own optimistic-update logic.
 */
export function useToggleSavedJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => seekerService.toggleSavedJob(jobId),
    onMutate: async (jobId) => {
      await Promise.all(JOB_LIST_QUERY_KEYS.map((key) => queryClient.cancelQueries({ queryKey: [key] })))
      await queryClient.cancelQueries({ queryKey: ['jobDetail', jobId] })

      const previousLists = JOB_LIST_QUERY_KEYS.flatMap((key) =>
        queryClient.getQueriesData<NearbyJobsResponse>({ queryKey: [key] })
      )
      const previousDetail = queryClient.getQueryData<NearbyJob>(['jobDetail', jobId])

      previousLists.forEach(([key, data]) => {
        if (!data?.jobs) return
        queryClient.setQueryData(key, {
          ...data,
          jobs: data.jobs.map((job) => (String(job.post_id) === jobId ? { ...job, is_saved: !job.is_saved } : job)),
        })
      })
      if (previousDetail) {
        queryClient.setQueryData(['jobDetail', jobId], { ...previousDetail, is_saved: !previousDetail.is_saved })
      }

      return { previousLists, previousDetail, jobId }
    },
    onError: (_err, _jobId, context) => {
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data))
      if (context?.previousDetail) queryClient.setQueryData(['jobDetail', context.jobId], context.previousDetail)
    },
    onSettled: (_data, _err, jobId) => {
      JOB_LIST_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
      queryClient.invalidateQueries({ queryKey: ['jobDetail', jobId] })
    },
  })
}
