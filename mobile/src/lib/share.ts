// mobile/src/lib/share.ts
//
// THE platform branch. One call site, one divergence, in the whole port.
//
// Everything else — the Supabase client, the habit queries, the Tailwind class
// names, the reducer logic — is shared with the web app unchanged. Sharing is
// only possible on the primitives: `navigator.share` has no React Native
// equivalent and `Share.share` has no DOM equivalent, so this is the seam.
import { Platform, Share } from 'react-native'

export type ShareOutcome =
  /** The OS share sheet was shown. */
  | 'shared'
  /** The user dismissed the share sheet. Not an error. */
  | 'dismissed'
  /** No share API at all on this platform. */
  | 'unavailable'

export type SharePayload = {
  title: string
  message: string
  url: string
}

// Resolved once, at module scope, so the choice is a single assignment rather
// than a conditional executed on every tap.
const shareWithWebApi = Platform.select({
  web: async (payload: SharePayload): Promise<ShareOutcome> => {
    // Web-only API. Unreachable on native: this function is only ever installed
    // when Platform.OS is 'web'. Guarded anyway, because `navigator.share` is
    // absent on desktop browsers and older mobile Safari, which would
    // otherwise throw a TypeError on tap.
    const nav: { share?: (data: SharePayload) => Promise<void> } | undefined = globalThis.navigator
    if (typeof nav?.share !== 'function') return 'unavailable'

    try {
      await nav.share(payload)
      return 'shared'
    } catch {
      return 'dismissed'
    }
  },
  default: undefined,
})

async function shareWithNativeApi(payload: SharePayload): Promise<ShareOutcome> {
  try {
    // React Native's Share takes `url` on iOS only; Android's share sheet reads
    // `message` alone, so the link has to be inlined there or the recipient
    // gets a title and no link.
    const result = await Share.share({
      title: payload.title,
      message: `${payload.message}\n${payload.url}`,
    })
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared'
  } catch {
    return 'dismissed'
  }
}

export function shareHabitLink(payload: SharePayload): Promise<ShareOutcome> {
  return shareWithWebApi ? shareWithWebApi(payload) : shareWithNativeApi(payload)
}
