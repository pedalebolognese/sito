// Plugin rehype: nel Markdown riscrive <img src="/media/..."> e <a href="/media/...">
// verso MEDIA_BASE (R2), e aggiunge loading="lazy" alle immagini.
import { mediaUrl } from './media-url.mjs';

export default function rehypeMedia(options = {}) {
  const base = options.base ?? '';
  const walk = (node) => {
    if (node.type === 'element') {
      const props = node.properties ?? {};
      if (node.tagName === 'img' && typeof props.src === 'string') {
        props.src = mediaUrl(props.src, base, 'full');
        props.loading = 'lazy';
        props.decoding = 'async';
      }
      if (node.tagName === 'a' && typeof props.href === 'string') {
        const href = props.href;
        if (/^\/media\/|wp-content\/uploads\//.test(href)) {
          // un link a un'immagine apre la versione web, un PDF l'originale
          props.href = mediaUrl(href, base, 'full');
          if (/\.pdf$/i.test(href)) props.target = '_blank';
        }
      }
    }
    if (node.children) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}
