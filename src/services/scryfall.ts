import type { Commander } from '../models/types';

const SCRYFALL_API = 'https://api.scryfall.com';

export interface ScryfallCard {
  name: string;
  image_uris?: {
    art_crop: string;
  };
  card_faces?: Array<{
    name: string;
    image_uris: {
      art_crop: string;
    };
  }>;
  color_identity: string[];
}

export const searchCommanders = async (query: string): Promise<Commander[]> => {
  if (!query || query.length < 3) return [];

  try {
    // Search for legendary creatures matching the query, including all unique artworks
    // and ensuring we actually get legendary creatures.
    const response = await fetch(
      `${SCRYFALL_API}/cards/search?q=t:legendary+t:creature+${encodeURIComponent(query)}&unique=art`
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.data) return [];

    return data.data.map((card: ScryfallCard) => {
      // Handle multifaced cards
      let artCrop = '';
      if (card.image_uris) {
        artCrop = card.image_uris.art_crop;
      } else if (card.card_faces && card.card_faces[0].image_uris) {
        artCrop = card.card_faces[0].image_uris.art_crop;
      }

      return {
        name: card.name,
        artCrop,
        colorIdentity: card.color_identity,
      };
    });
  } catch (error) {
    console.error('Scryfall search error:', error);
    return [];
  }
};

export const autocompleteCommanders = async (query: string): Promise<string[]> => {
  if (!query) return [];

  try {
    const response = await fetch(
      `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Scryfall autocomplete error:', error);
    return [];
  }
};
