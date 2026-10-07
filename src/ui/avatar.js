import { AVATAR_COLORS } from '../game/avatars.js';
import { h } from './dom.js';

export function avatarBadge(player, style = '') {
  return h('div', {
    class: player.avatar.emoji ? 'avatar emoji' : 'avatar',
    style: `--seat-color:${AVATAR_COLORS[player.avatar.color]};${style}`,
  }, player.avatar.emoji || player.name.charAt(0).toUpperCase());
}
