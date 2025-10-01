import axios, { AxiosResponse } from 'axios';
import User, { IUser } from '../models/User';
import { recommendationService } from './recommendation.service';
import { MoodType, MoodIntensity } from '../models/Mood';

// Interfaces para Spotify API
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height: number; width: number }>;
  followers: { total: number };
  product: 'premium' | 'free';
  country: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
    release_date: string;
  };
  duration_ms: number;
  preview_url?: string;
  external_urls: { spotify: string };
  popularity: number;
  explicit: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  external_urls: { spotify: string };
  images: Array<{ url: string; height: number; width: number }>;
  tracks: {
    total: number;
    items: Array<{ track: SpotifyTrack }>;
  };
  owner: {
    id: string;
    display_name: string;
  };
  public: boolean;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  public?: boolean;
}

export class SpotifyService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl = 'https://api.spotify.com/v1';
  private readonly accountsUrl = 'https://accounts.spotify.com';

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ Credenciales de Spotify no configuradas');
    }
  }

  /**
   * Generar URL de autorización de Spotify
   */
  getAuthorizationUrl(state?: string): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-library-modify',
      'user-top-read',
      'user-read-recently-played',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state || 'moodify_auth'
    });

    return `${this.accountsUrl}/authorize?${params.toString()}`;
  }

  /**
   * Intercambiar código por tokens de acceso
   */
  async exchangeCodeForToken(code: string): Promise<SpotifyTokenResponse> {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response: AxiosResponse<SpotifyTokenResponse> = await axios.post(
        `${this.accountsUrl}/api/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error intercambiando código por token:', error.response?.data || error.message);
      throw new Error('Error obteniendo token de Spotify');
    }
  }

  /**
   * Refrescar token de acceso
   */
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response: AxiosResponse<SpotifyTokenResponse> = await axios.post(
        `${this.accountsUrl}/api/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error refrescando token:', error.response?.data || error.message);
      throw new Error('Error refrescando token de Spotify');
    }
  }

  /**
   * Obtener perfil del usuario de Spotify
   */
  async getUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    try {
      const response: AxiosResponse<SpotifyUserProfile> = await axios.get(
        `${this.baseUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo perfil de Spotify:', error.response?.data || error.message);
      throw new Error('Error obteniendo perfil de Spotify');
    }
  }

  /**
   * Verificar y refrescar token si es necesario
   */
  async ensureValidToken(user: IUser): Promise<string> {
    if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
      throw new Error('Usuario no tiene cuenta de Spotify conectada');
    }

    // Verificar si el token expiró
    const now = new Date();
    const expiry = user.spotifyTokenExpiry || new Date(0);

    if (now >= expiry) {
      // Token expirado, refrescar
      console.log('Token de Spotify expirado, refrescando...');
      const tokenData = await this.refreshAccessToken(user.spotifyRefreshToken);

      // Actualizar usuario con nuevo token
      user.spotifyAccessToken = tokenData.access_token;
      user.spotifyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
      await user.save();

      return tokenData.access_token;
    }

    return user.spotifyAccessToken;
  }

  /**
   * Buscar tracks basado en mood
   */
  async searchTracksByMood(
    accessToken: string,
    moodType: MoodType,
    intensity: MoodIntensity,
    userGenres?: string[],
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    try {
      const searchParams = recommendationService.getSpotifySearchParams(moodType, intensity, userGenres);
      
      // Construir query de búsqueda
      const profile = recommendationService.getMusicProfile(moodType, intensity);
      const genres = userGenres && userGenres.length > 0 ? userGenres : profile.genres;
      const query = `genre:${genres[0]} ${profile.keywords[0]}`;

      const response = await axios.get(
        `${this.baseUrl}/search`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            q: query,
            type: 'track',
            limit,
            market: 'US'
          }
        }
      );

      return response.data.tracks.items;
    } catch (error: any) {
      console.error('Error buscando tracks:', error.response?.data || error.message);
      throw new Error('Error buscando música en Spotify');
    }
  }

  /**
   * Obtener recomendaciones basadas en seeds
   */
  async getRecommendations(
  accessToken: string,
  moodType: MoodType,
  intensity: MoodIntensity,
  userGenres?: string[],
  limit: number = 20
): Promise<SpotifyTrack[]> {
  try {
    const params = recommendationService.getSpotifySearchParams(moodType, intensity, userGenres);
    
    // Spotify requiere al menos 1 seed (género, artista o track)
    const response = await axios.get(
      `${this.baseUrl}/recommendations`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          seed_genres: params.seed_genres,  // Géneros como seed
          target_valence: params.target_valence,  // 0.8 para happy
          target_energy: params.target_energy,    // 0.7 para happy
          target_danceability: params.target_danceability,
          min_tempo: params.min_tempo,
          max_tempo: params.max_tempo,
          limit,
          market: 'US'
        }
      }
    );

    return response.data.tracks;
  } catch (error: any) {
    console.error('Error con /recommendations:', error.response?.data);
    // Fallback: buscar por género
    return await this.searchByGenreOnly(accessToken, moodType, intensity, limit, userGenres);
  }
}

  /**
   * Crear playlist en la cuenta del usuario
   */
  async createPlaylist(
    accessToken: string,
    userId: string,
    playlistData: CreatePlaylistRequest
  ): Promise<SpotifyPlaylist> {
    try {
      const response: AxiosResponse<SpotifyPlaylist> = await axios.post(
        `${this.baseUrl}/users/${userId}/playlists`,
        {
          name: playlistData.name,
          description: playlistData.description || 'Creada por Moodify',
          public: playlistData.public !== undefined ? playlistData.public : false
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error creando playlist:', error.response?.data || error.message);
      throw new Error('Error creando playlist en Spotify');
    }
  }

  /**
   * Agregar tracks a una playlist
   */
  async addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    try {
      // Spotify permite máximo 100 tracks por request
      const batchSize = 100;
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);
        
        await axios.post(
          `${this.baseUrl}/playlists/${playlistId}/tracks`,
          {
            uris: batch
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    } catch (error: any) {
      console.error('Error agregando tracks a playlist:', error.response?.data || error.message);
      throw new Error('Error agregando canciones a la playlist');
    }
  }

  /**
   * Crear playlist completa basada en mood
   */
  async createMoodPlaylist(
    user: IUser,
    moodType: MoodType,
    intensity: MoodIntensity,
    userGenres?: string[],
    customName?: string
  ): Promise<{
    playlist: SpotifyPlaylist;
    tracks: SpotifyTrack[];
  }> {
    try {
      // Asegurar token válido
      const accessToken = await this.ensureValidToken(user);

      // Obtener recomendaciones
      const tracks = await this.getRecommendations(accessToken, moodType, intensity, userGenres, 20);

      if (tracks.length === 0) {
        throw new Error('No se encontraron canciones para este mood');
      }

      // Generar nombre y descripción de la playlist
      const playlistName = customName || recommendationService.generatePlaylistName(moodType, intensity);
      const playlistDescription = recommendationService.generatePlaylistDescription(moodType, intensity);

      // Crear playlist
      const playlist = await this.createPlaylist(
        accessToken,
        user.spotifyId!,
        {
          name: playlistName,
          description: playlistDescription,
          public: false
        }
      );

      // Agregar tracks a la playlist
      const trackUris = tracks.map(track => `spotify:track:${track.id}`);
      await this.addTracksToPlaylist(accessToken, playlist.id, trackUris);

      return {
        playlist,
        tracks
      };
    } catch (error: any) {
      console.error('Error creando playlist de mood:', error);
      throw error;
    }
  }

  /**
   * Obtener playlist por ID
   */
  async getPlaylist(accessToken: string, playlistId: string): Promise<SpotifyPlaylist> {
    try {
      const response: AxiosResponse<SpotifyPlaylist> = await axios.get(
        `${this.baseUrl}/playlists/${playlistId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo playlist:', error.response?.data || error.message);
      throw new Error('Error obteniendo playlist de Spotify');
    }
  }

  /**
   * Obtener playlists del usuario
   */
  async getUserPlaylists(accessToken: string, limit: number = 20): Promise<SpotifyPlaylist[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/playlists`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            limit
          }
        }
      );

      return response.data.items;
    } catch (error: any) {
      console.error('Error obteniendo playlists del usuario:', error.response?.data || error.message);
      throw new Error('Error obteniendo playlists');
    }
  }

  /**
   * Reproducir track o playlist
   */
  async play(
    accessToken: string,
    contextUri?: string, // spotify:playlist:xxx o spotify:album:xxx
    uris?: string[], // Array de spotify:track:xxx
    deviceId?: string
  ): Promise<void> {
    try {
      const body: any = {};
      if (contextUri) body.context_uri = contextUri;
      if (uris) body.uris = uris;

      const url = deviceId 
        ? `${this.baseUrl}/me/player/play?device_id=${deviceId}`
        : `${this.baseUrl}/me/player/play`;

      await axios.put(
        url,
        body,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      console.error('Error reproduciendo:', error.response?.data || error.message);
      throw new Error('Error reproduciendo música. Asegúrate de tener Spotify Premium y un dispositivo activo');
    }
  }

  /**
   * Pausar reproducción
   */
  async pause(accessToken: string, deviceId?: string): Promise<void> {
    try {
      const url = deviceId 
        ? `${this.baseUrl}/me/player/pause?device_id=${deviceId}`
        : `${this.baseUrl}/me/player/pause`;

      await axios.put(
        url,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error: any) {
      console.error('Error pausando reproducción:', error.response?.data || error.message);
      throw new Error('Error pausando reproducción');
    }
  }

  /**
   * Obtener dispositivos disponibles
   */
  async getDevices(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/player/devices`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data.devices;
    } catch (error: any) {
      console.error('Error obteniendo dispositivos:', error.response?.data || error.message);
      throw new Error('Error obteniendo dispositivos');
    }
  }

  /**
   * Conectar cuenta de Spotify al usuario
   */
  async connectSpotifyAccount(userId: string, code: string): Promise<IUser> {
    try {
      // Intercambiar código por tokens
      const tokenData = await this.exchangeCodeForToken(code);

      // Obtener perfil de Spotify
      const profile = await this.getUserProfile(tokenData.access_token);

      // Actualizar usuario
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      user.spotifyId = profile.id;
      user.spotifyAccessToken = tokenData.access_token;
      user.spotifyRefreshToken = tokenData.refresh_token!;
      user.spotifyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
      user.isPremium = profile.product === 'premium';

      if (profile.images && profile.images.length > 0) {
        user.avatar = profile.images[0].url;
      }

      await user.save();

      return user;
    } catch (error: any) {
      console.error('Error conectando cuenta de Spotify:', error);
      throw error;
    }
  }

  /**
   * Desconectar cuenta de Spotify
   */
  async disconnectSpotifyAccount(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    user.spotifyId = undefined;
    user.spotifyAccessToken = undefined;
    user.spotifyRefreshToken = undefined;
    user.spotifyTokenExpiry = undefined;
    user.isPremium = false;

    await user.save();

    return user;
  }
  // Nuevo método de fallback más inteligente
  private async searchByGenreOnly(
  accessToken: string,
  moodType: MoodType,
  intensity: MoodIntensity,
  limit: number,
  userGenres?: string[]
): Promise<SpotifyTrack[]> {
  const profile = recommendationService.getMusicProfile(moodType, intensity);
  const genre = userGenres?.[0] || profile.genres[0];
  
  // Buscar solo por género, sin keywords en el título
  const response = await axios.get(
    `${this.baseUrl}/search`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: {
        q: `genre:"${genre}"`,  // Solo género, sin keywords
        type: 'track',
        limit,
        market: 'US'
      }
    }
  );

  return response.data.tracks.items;
  }
}

// Exportar instancia única
export const spotifyService = new SpotifyService();