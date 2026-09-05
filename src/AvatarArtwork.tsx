import { DEFAULT_AVATAR, XENSI_AVATARS, isAvatarId } from './avatars'

export function AvatarArtwork({ avatarId, className = '' }: { avatarId: string; className?: string }) {
  const resolved = isAvatarId(avatarId) ? avatarId : DEFAULT_AVATAR
  const avatar = XENSI_AVATARS.find((item) => item.id === resolved)!
  const sheet = avatar.group === 'cats' ? 'xensi-cats.png' : avatar.group === 'dogs' ? 'xensi-dogs.png' : 'xensi-hamsters.png'
  return <span className={`xensi-avatar-art avatar-${resolved} ${className}`} style={{ backgroundImage: `url(./avatars/${sheet})` }} role="img" aria-label={avatar.label} />
}
