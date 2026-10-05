import { useAuth } from '@/context/authContext'
import AuthLayout from '@/layouts/AuthLayout'
import ChangePasswordForm from '@/components/common/auth/ChangePasswordForm'
import { Button } from '@/components/ui/button'
import { FormNotice } from '@/components/common/Fields'

export default function ChangePasswordGate() {
  const { user, signOut } = useAuth()

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          Signed in as <span className="font-medium text-foreground">{user?.username}</span>
        </>
      }
    >
      <div className="space-y-4">
        <FormNotice message="This account is using a password somebody else set. Choose your own to continue — nothing else is available until you do." />

        <ChangePasswordForm
          onDone={() => {
          }}
        />

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => void signOut()}
        >
          Sign out instead
        </Button>
      </div>
    </AuthLayout>
  )
}
