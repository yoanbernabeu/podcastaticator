
import Alpine from 'alpinejs';

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

window.Alpine = Alpine;

Alpine.data('episodeDetail', () => ({
  episode: null as any,
  async init() {
    const params = new URLSearchParams(window.location.search);
    const titleParam = params.get('title');
    if (!titleParam) return;

    // Récupérer config + RSS
    const configResp = await fetch('/config.json');
    if (!configResp.ok) return;
    const config = await configResp.json();
    const rssResp = await fetch(config.rssFeed);
    if (!rssResp.ok) return;
    const rssText = await rssResp.text();
    const parser = new DOMParser();
    const rssDoc = parser.parseFromString(rssText, 'application/xml');

    const items = Array.from(rssDoc.querySelectorAll('item')).map((it) => ({
      title: it.querySelector('title')?.textContent || '',
      description: it.querySelector('description')?.textContent || '',
      pubDate: it.querySelector('pubDate')?.textContent || '',
      image: it.querySelector('itunes\\:image')?.getAttribute('href') 
              || it.querySelector('image')?.textContent 
              || '',
    }));

    this.episode = items.find((e) => e.title === titleParam) || null;
  },
}));

Alpine.start();