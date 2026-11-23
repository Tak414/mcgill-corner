/**
 * The demo world: the same accounts and real McGill events as backend/database/seeders/DemoSeeder.php,
 * so the in-browser demo and the seeded server tell the same story.
 */

/** [title, description, location name, address, lat, lng, starts in (min), ends in (min)] */
export const DEMO_EVENTS: [string, string, string, string, number, number, number, number][] = [
  ['Grand Chœur de McGill et Chœur universitaire de McGill', 'Concert performed by the McGill University choirs.', 'Pollack Concert Hall', '555 Sherbrooke St W, Montreal', 45.5057, -73.5733, -30, 90],
  ['McGill Jazz Combos', 'Live jazz performance by McGill Faculty of Music students.', 'Upstairs Jazz Bar & Grill', '1254 Rue Mackay, Montreal', 45.4956, -73.5768, -60, 120],
  ['McGill Infant Mental Health Day', 'Clinical seminar on infant development and attachment theory (CA$90).', 'MUHC Glen Site', '1001 Bd Décarie, Montreal', 45.4719, -73.6026, -120, 300],
  ['Noël jazzé - Rémi Bolduc', 'Free jazz concert featuring saxophonist and McGill music faculty lecturer Rémi Bolduc.', 'Maison de la culture NDG – Botrel', '3755 Rue Botrel, Montreal', 45.4756, -73.6144, 300, 420],
  ['Basketball - MCGILL @ UQAM', 'Varsity basketball game against the UQAM Citadins.', 'UQAM Sports Center', '1212 Rue Sanguinet, Montreal', 45.512, -73.56, 360, 480],
  ['McGill University vs Université de Montréal', 'Varsity ice hockey rivalry game against Université de Montréal.', 'McConnell Arena', '3883 Rue University, Montreal', 45.5119, -73.5827, 480, 630],
];

export const DEMO_HOSTS: [string, string][] = [
  ['host1@unlock.test', 'UNLOCK Host One'],
  ['host2@unlock.test', 'UNLOCK Host Two'],
];
export const HOST_PASSWORD = 'host12345';
export const ATTENDEE_PASSWORD = 'unlock123';

/** [email, name, {zone_id: completed exchanges}, indexes of events they are going to] — highest score first. */
export const DEMO_ATTENDEES: [string, string, Record<number, number>, number[]][] = [
  ['sophie.tremblay@unlock.test', 'Sophie Tremblay', { 45: 1, 46: 1, 24: 2, 25: 1 }, [0, 5]],
  ['daniel.okafor@unlock.test', 'Daniel Okafor', { 45: 2, 55: 1, 35: 1, 23: 1 }, [1, 4]],
  ['priya.raman@unlock.test', 'Priya Raman', { 45: 1, 56: 1, 36: 1, 26: 1 }, [2]],
  ['lucas.gagnon@unlock.test', 'Lucas Gagnon', { 45: 1, 44: 1, 54: 1 }, [0, 5]],
  ['mei.lin@unlock.test', 'Mei Lin', { 45: 1, 35: 1, 24: 1, 25: 1 }, [1, 3]],
  ['omar.haddad@unlock.test', 'Omar Haddad', { 45: 2, 47: 1 }, [4, 5]],
  ['chloe.bouchard@unlock.test', 'Chloé Bouchard', { 55: 1, 24: 1, 57: 1 }, [0, 3]],
  ['ethan.wright@unlock.test', 'Ethan Wright', { 46: 1, 37: 1, 65: 1 }, [1]],
  ['attendee1@unlock.test', 'Alex Chen', { 46: 1, 25: 1 }, []],
  ['attendee2@unlock.test', 'Maya Singh', { 44: 1 }, []],
  ['gabriel.roy@unlock.test', 'Gabriel Roy', { 45: 1 }, [5]],
  ['aisha.mohamed@unlock.test', 'Aisha Mohamed', { 56: 1 }, [2, 4]],
  ['julien.lefebvre@unlock.test', 'Julien Lefebvre', { 24: 1, 25: 1 }, [0]],
  ['hana.kim@unlock.test', 'Hana Kim', { 23: 1, 33: 1 }, [1, 3]],
  ['mateo.garcia@unlock.test', 'Mateo Garcia', { 64: 1, 65: 1 }, [4]],
  ['amelie.cote@unlock.test', 'Amélie Côté', { 26: 1, 27: 1 }, [0, 2]],
  ['ravi.patel@unlock.test', 'Ravi Patel', { 53: 1, 63: 1 }, [5]],
  ['nora.lindqvist@unlock.test', 'Nora Lindqvist', { 24: 1 }, [2]],
  ['samuel.nguyen@unlock.test', 'Samuel Nguyen', { 37: 1 }, [1]],
  ['ines.benali@unlock.test', 'Inès Benali', { 53: 1 }, [3]],
  ['liam.oconnor@unlock.test', "Liam O'Connor", { 66: 1 }, [4]],
  ['zoe.morin@unlock.test', 'Zoé Morin', { 27: 1 }, []],
];

/** The first explorer going to each seeded event plays the person you meet there; their code is always this. */
export const PARTNER_CODE = '2468';
/** How long the simulated partner takes to enter your code after you enter theirs. */
export const PARTNER_DELAY_MS = 4000;
