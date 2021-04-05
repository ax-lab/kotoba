/**
 * @file This library contains shared definitions between the frontend and
 * backend.
 */

export * from './entities'

export { SubtitleFile } from './subtitles'

export const RE_JAPANESE = /([\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B)+/g
