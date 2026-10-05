import { toast } from 'sonner'
import { errorMessage } from '@/api/client'

export const notify = {
  success(message: string, description?: string) {
    return toast.success(message, { description })
  },

  error(message: string, description?: string) {
    return toast.error(message, { description })
  },

  warning(message: string, description?: string) {
    return toast.warning(message, { description })
  },

  info(message: string, description?: string) {
    return toast.info(message, { description })
  },

  failure(action: string, error: unknown) {
    return toast.error(`Unable to ${action}.`, {
      description: errorMessage(error, 'The server did not explain what went wrong.'),
    })
  },

  pending(message: string): string | number {
    return toast.loading(message, { duration: Infinity })
  },

  promise<T>(
    work: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string }
  ) {
    return toast.promise(work, {
      loading: messages.loading,
      success: messages.success,
      error: (err: unknown) => ({
        message: messages.error,
        description: errorMessage(err, 'The server did not explain what went wrong.'),
      }),
    })
  },

  dismiss(id?: string | number) {
    toast.dismiss(id)
  },
}
