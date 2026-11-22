/**
 * Display names for the 100 grid zones (id = row * 10 + col; row 0 = south, col 0 = west).
 * Display only: the server still decides every zone by the integer grid formula.
 * Each cell gets the neighbourhood that covers most of it, so borders are approximate.
 * `short` fits inside a cell on a phone (max 12 characters); `full` is for roomier places.
 */
type ZoneName = { short: string; full: string };

const NAMES: readonly ZoneName[] = [
  // row 0 (south edge)
  { short: 'Lachine E', full: 'Lachine East' },
  { short: 'St-Pierre', full: 'Saint-Pierre' },
  { short: 'LaSalle N', full: 'LaSalle North' },
  { short: 'LaSalle E', full: 'LaSalle East' },
  { short: 'Angrignon', full: 'Parc Angrignon' },
  { short: 'Ville-Émard', full: 'Ville-Émard' },
  { short: 'Verdun S', full: 'Verdun South' },
  { short: "Nuns' Is. S", full: "Nuns' Island South" },
  { short: 'Seaway', full: 'St. Lawrence Seaway' },
  { short: 'Brossard W', full: 'Brossard West' },
  // row 1
  { short: 'CSL South', full: 'Côte-Saint-Luc South' },
  { short: 'Mtl-Ouest', full: 'Montréal-Ouest' },
  { short: 'Loyola', full: 'Loyola (Concordia)' },
  { short: 'NDG South', full: 'NDG South' },
  { short: 'Turcot', full: 'Turcot' },
  { short: 'Côte-St-Paul', full: 'Côte-Saint-Paul' },
  { short: 'Verdun', full: 'Verdun' },
  { short: "Nuns' Island", full: "Nuns' Island" },
  { short: 'Champlain', full: 'Champlain Bridge' },
  { short: 'Brossard N', full: 'Brossard North' },
  // row 2
  { short: 'Côte-St-Luc', full: 'Côte-Saint-Luc' },
  { short: 'Hampstead', full: 'Hampstead' },
  { short: 'NDG West', full: 'NDG West' },
  { short: 'NDG', full: 'NDG / Monkland' },
  { short: 'Vendôme', full: 'Vendôme / Westmount Park' },
  { short: 'St-Henri', full: 'Saint-Henri / Atwater Market' },
  { short: 'The Point', full: 'Pointe-Saint-Charles' },
  { short: 'Pointe-Nord', full: "Pointe-Nord (Nuns' Island)" },
  { short: 'River', full: 'St. Lawrence River' },
  { short: 'St-Lambert S', full: 'Saint-Lambert South' },
  // row 3
  { short: 'CSL North', full: 'Côte-Saint-Luc North' },
  { short: 'Namur', full: 'Namur' },
  { short: 'Snowdon', full: 'Snowdon' },
  { short: 'Oratory', full: "Saint Joseph's Oratory" },
  { short: 'Westmount', full: 'Upper Westmount' },
  { short: 'Concordia', full: 'Concordia / Atwater' },
  { short: 'Griffintown', full: 'Griffintown / Little Burgundy' },
  { short: 'Victoria Br', full: 'Victoria Bridge' },
  { short: 'Seaway Lock', full: 'Saint-Lambert Lock' },
  { short: 'St-Lambert', full: 'Saint-Lambert' },
  // row 4 (McGill row)
  { short: 'Du Collège', full: 'Du Collège (Saint-Laurent)' },
  { short: 'Le Triangle', full: 'Le Triangle' },
  { short: 'CDN West', full: 'Côte-des-Neiges West' },
  { short: 'UdeM', full: 'Université de Montréal' },
  { short: 'Mt Royal W', full: 'Mount Royal West' },
  { short: 'McGill', full: 'McGill / Downtown' },
  { short: 'Old Montréal', full: 'Old Montréal / Chinatown' },
  { short: 'Old Port', full: 'Old Port' },
  { short: 'Notre-Dame', full: 'Île Notre-Dame' },
  { short: 'St-Lambert N', full: 'Saint-Lambert North' },
  // row 5
  { short: 'St-Laurent', full: 'Saint-Laurent' },
  { short: 'TMR West', full: 'Town of Mount Royal West' },
  { short: 'TMR', full: 'Town of Mount Royal' },
  { short: 'Outremont', full: 'Outremont' },
  { short: 'Mile End', full: 'Mile End' },
  { short: 'Milton-Parc', full: 'Milton-Parc' },
  { short: 'UQAM', full: 'Quartier Latin / UQAM' },
  { short: 'Village', full: 'The Village' },
  { short: 'Ste-Hélène', full: 'Île Sainte-Hélène' },
  { short: 'Longueuil S', full: 'Longueuil South' },
  // row 6
  { short: 'St-Laurent N', full: 'Saint-Laurent North' },
  { short: 'Central Mkt', full: 'Marché Central' },
  { short: 'Parc-Ex', full: 'Parc-Extension' },
  { short: 'Little Italy', full: 'Little Italy / Jean-Talon' },
  { short: 'Mile-Ex', full: 'Mile-Ex' },
  { short: 'Plateau', full: 'Plateau Mont-Royal' },
  { short: 'La Fontaine', full: 'Parc La Fontaine' },
  { short: 'Frontenac', full: 'Sainte-Marie / Frontenac' },
  { short: 'Longueuil', full: 'Longueuil Metro' },
  { short: 'Vx-Longueuil', full: 'Vieux-Longueuil' },
  // row 7
  { short: 'Bordeaux', full: 'Bordeaux-Cartierville' },
  { short: 'Sauvé', full: 'Sauvé' },
  { short: 'Crémazie', full: 'Crémazie / Chabanel' },
  { short: 'Villeray', full: 'Villeray' },
  { short: 'Villeray E', full: 'Villeray East' },
  { short: 'Pte-Patrie', full: 'La Petite-Patrie' },
  { short: 'Rosemont', full: 'Rosemont / Angus' },
  { short: 'Hochelaga', full: 'Hochelaga' },
  { short: 'Maisonneuve', full: 'Maisonneuve' },
  { short: 'Longueuil N', full: 'Longueuil North' },
  // row 8
  { short: 'Ahuntsic W', full: 'Ahuntsic West' },
  { short: 'Ahuntsic', full: 'Ahuntsic' },
  { short: 'Ahuntsic E', full: 'Ahuntsic East' },
  { short: 'TOHU', full: 'TOHU / Frédéric-Back Park' },
  { short: 'St-Michel', full: 'Saint-Michel' },
  { short: 'Rosemont N', full: 'Rosemont North' },
  { short: 'Botanical', full: 'Botanical Garden' },
  { short: 'Olympic', full: 'Olympic Park' },
  { short: 'Mercier W', full: 'Mercier West' },
  { short: 'Bellerive', full: 'Bellerive' },
  // row 9 (north edge)
  { short: 'Pont-Viau', full: 'Pont-Viau (Laval)' },
  { short: 'Visitation', full: 'Île-de-la-Visitation' },
  { short: 'Le Sault', full: 'Sault-au-Récollet' },
  { short: 'St-Michel N', full: 'Saint-Michel North' },
  { short: 'St-Michel E', full: 'Saint-Michel East' },
  { short: 'St-Léonard', full: 'Saint-Léonard' },
  { short: 'Rosemont E', full: 'Nouveau-Rosemont' },
  { short: 'Assomption', full: 'Assomption' },
  { short: 'Mercier E', full: 'Mercier East' },
  { short: 'Tétreault', full: 'Tétreaultville' },
];

/** The names for a zone id, or undefined for an id outside 0–99. */
export function zoneName(zoneId: number): ZoneName | undefined {
  return NAMES[zoneId];
}

/** Short name that fits inside a map cell, e.g. "McGill". Unknown ids fall back to "Zone 7". */
export function zoneShortName(zoneId: number): string {
  return NAMES[zoneId]?.short ?? `Zone ${zoneId}`;
}

/** Full neighbourhood name, e.g. "McGill / Downtown". Unknown ids fall back to "Zone 7". */
export function zoneFullName(zoneId: number): string {
  return NAMES[zoneId]?.full ?? `Zone ${zoneId}`;
}

export const ZONE_NAME_COUNT = NAMES.length;
