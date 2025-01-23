import './style.css';
import Alpine from 'alpinejs';

declare global {
    interface Window {
        Alpine: typeof Alpine;
    }
}

window.Alpine = Alpine;

type Config = {
  rssFeed: string;
  socialLinks: {
    twitter?: string;
    facebook?: string;
  };
  listenOn: {
    spotify?: string;
    apple?: string;
    google?: string;
    amazon?: string;
    deezer?: string;
    youtube?: string;
  };
};

type PodcastInfo = {
  title: string;
  description: string;
  image: string;
};

type Episode = {
  title: string;
  description: string;
  audio: string;
  pubDate: string;
};

Alpine.data('podcast', () => ({
  config: {} as Config,
  podcastInfo: {} as PodcastInfo,
  episodes: [] as Episode[],
  currentEpisode: null as Episode | null,
  view: 'list',

  showEpisode(episode: Episode) {
    this.currentEpisode = episode;
    this.view = 'player';
  },

  goToList() {
    this.view = 'list';
  },

  async init() {
    try {
      // Charger la configuration
      const response = await fetch('/config.json');
      if (!response.ok) throw new Error('Erreur de chargement du fichier config.json');
      this.config = await response.json();

      // Charger le flux RSS
      const rssResponse = await fetch(this.config.rssFeed);
      if (!rssResponse.ok) throw new Error('Erreur de chargement du flux RSS');
      const rssText = await rssResponse.text();
      const parser = new DOMParser();
      const rssDoc = parser.parseFromString(rssText, 'application/xml');

      // Extraire les infos principales du podcast
      const channel = rssDoc.querySelector('channel');
      if (!channel) throw new Error('Flux RSS invalide : channel manquant');

      this.podcastInfo = {
        title: channel.querySelector('title')?.textContent || 'Titre non trouvé',
        description: channel.querySelector('description')?.textContent || 'Description non trouvée',
        image: channel.querySelector('image url')?.textContent || '',
      };

      // Extraire les épisodes
      this.episodes = Array.from(channel.querySelectorAll('item')).map((item) => ({
        title: item.querySelector('title')?.textContent || 'Sans titre',
        description: item.querySelector('description')?.textContent || 'Pas de description',
        audio: item.querySelector('enclosure')?.getAttribute('url') || '',
        pubDate: item.querySelector('pubDate')?.textContent || '',
      }));
    } catch (error) {
      console.error('Erreur lors de l’initialisation :', error);
    }
  },
}));

Alpine.start();
