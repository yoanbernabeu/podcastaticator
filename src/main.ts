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
  image?: string;
};

Alpine.data('podcast', () => ({
  config: {} as Config,
  podcastInfo: {} as PodcastInfo,
  episodes: [] as Episode[],
  currentEpisode: null as Episode | null,
  isPlayerVisible: false,
  detailEpisode: null as Episode | null,
  isDetailVisible: false,

  showEpisode(episode: Episode, action: 'play' | 'view' = 'play') {
    if (action === 'play') {
      if (this.currentEpisode && this.currentEpisode !== episode) {
        const audio = document.querySelector('audio');
        if (audio) audio.pause();
      }
      this.currentEpisode = episode;
      this.isPlayerVisible = true;
      setTimeout(() => {
        const audio = document.querySelector('audio');
        if (audio) audio.play();
      }, 100);
    } else if (action === 'view') {
      this.detailEpisode = episode;
      this.isDetailVisible = true;
    }
  },

  hideDetail() {
    this.isDetailVisible = false;
    this.detailEpisode = null;
  },

  hidePlayer() {
    // Ne plus stopper la lecture ici
    this.isPlayerVisible = false;
    this.currentEpisode = null;
  },

  async init() {
    try {
      // Charger la configuration
      const response = await fetch('/config.json');
      if (!response.ok) throw new Error('Erreur de chargement du fichier config.json');
      this.config = await response.json();

      // Charger le flux RSS avec logging
      console.log('Chargement du flux RSS depuis:', this.config.rssFeed);
      const rssResponse = await fetch(this.config.rssFeed);
      if (!rssResponse.ok) throw new Error('Erreur de chargement du flux RSS');
      const rssText = await rssResponse.text();
      console.log('Flux RSS chargé, taille:', rssText.length);

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

      // Mettre à jour les balises meta manuellement
      document.title = this.podcastInfo.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', this.podcastInfo.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', this.podcastInfo.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', this.podcastInfo.description);
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', this.podcastInfo.image);
      document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', this.podcastInfo.title);
      document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', this.podcastInfo.description);
      document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', this.podcastInfo.image);
      document.querySelector('meta[name="author"]')?.setAttribute('content', this.podcastInfo.title);
      document.querySelector('link[rel="icon"]')?.setAttribute('href', this.podcastInfo.image);
      document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', this.podcastInfo.image);

      // Extraire les épisodes avec logging détaillé
      const items = channel.querySelectorAll('item');
      console.log(`Trouvé ${items.length} épisodes dans le flux RSS`);

      this.episodes = Array.from(items).map((item, index) => {
        console.log(`\n==== ÉPISODE #${index} ====`);
        // Debug : afficher le XML complet de l'item
        console.log(new XMLSerializer().serializeToString(item));

        // Récupération de l'audio
        const enclosure = item.querySelector('enclosure');
        const audioUrl = enclosure?.getAttribute('url') || '';
        console.log('URL Audio:', audioUrl);

        // Récupération de l'image avec plusieurs méthodes
        let imageUrl = '';
        
        // 1. Essayer querySelector avec échappement
        const itunesImage = item.querySelector('itunes\\:image');
        console.log('iTunes image via querySelector:', itunesImage);
        
        // 2. Essayer getElementsByTagName
        const itunesElements = item.getElementsByTagName('itunes:image');
        console.log('iTunes elements via TagName:', itunesElements?.length);
        
        // 3. Essayer avec namespace
        const nsImage = item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'image');
        console.log('iTunes image via NS:', nsImage?.length);

        // Récupérer l'URL de la première méthode qui fonctionne
        if (itunesImage?.hasAttribute('href')) {
          imageUrl = itunesImage.getAttribute('href') || '';
          console.log('Image URL depuis querySelector:', imageUrl);
        } else if (itunesElements?.[0]?.getAttribute('href')) {
          imageUrl = itunesElements[0].getAttribute('href') || '';
          console.log('Image URL depuis getElementsByTagName:', imageUrl);
        } else if (nsImage?.[0]?.getAttribute('href')) {
          imageUrl = nsImage[0].getAttribute('href') || '';
          console.log('Image URL depuis namespace:', imageUrl);
        } else {
          imageUrl = this.podcastInfo.image;
          console.log('Fallback vers image du podcast:', imageUrl);
        }

        return {
          title: item.querySelector('title')?.textContent || 'Sans titre',
          description: item.querySelector('description')?.textContent || 'Pas de description',
          audio: audioUrl,
          pubDate: item.querySelector('pubDate')?.textContent || '',
          image: imageUrl
        };
      });

    } catch (error) {
      console.error('Erreur lors de l’initialisation :', error);
    }
  },
}));

Alpine.start();
